import type { FastifyInstance } from "fastify";
import { requireUser } from "../auth.js";
import { z } from "../validation.js";

// Sync protocol (see docs/decisions/0005-teams-and-sync.md):
// - The app pushes changed documents (POST /sync). Last write wins per
//   document by the time it was changed; notes are append-only.
// - The app pulls everything it may see that changed after its cursor
//   (GET /sync). `scope` changes when the set of teams or co-coaches changes;
//   a different scope makes the server send everything again.

export const MAX_DATA_BYTES = 128 * 1024;
const PULL_LIMIT = 500;
export const sportSchema = z.enum(["hockey", "innebandy"]);
const KINDS = ["team", "session", "note", "drill"] as const;

const recordSchema = z.object({
  kind: z.enum(KINDS),
  id: z.string().min(1).max(100),
  teamId: z.string().min(1).max(100).optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  deleted: z.boolean().optional(),
  updatedAt: z.iso.datetime({ offset: true })
});

export default async function syncRoutes(app: FastifyInstance) {
  const { db } = app;

  app.get("/sync", async (req) => {
    const user = requireUser(req);
    const q = z
      .object({
        sport: sportSchema,
        since: z.coerce.number().int().min(0).default(0),
        scope: z.string().max(64).optional()
      })
      .parse(req.query);

    const { rows: teams } = await db.query<{ id: string; role: string }>(
      `SELECT tm.team_id AS id, tm.role FROM team_members tm JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.sport = $2 ORDER BY tm.team_id`,
      [user.id, q.sport]
    );
    const teamIds = teams.map((t) => t.id);
    // Co-coaches in any of my teams (their drills are visible to me), plus me.
    const { rows: peerRows } = await db.query<{ user_id: string }>(
      `SELECT DISTINCT user_id FROM team_members WHERE team_id = ANY($1::text[])
       UNION SELECT $2::uuid ORDER BY 1`,
      [teamIds, user.id]
    );
    const peers = peerRows.map((r) => r.user_id);
    const { rows: scopeRows } = await db.query<{ scope: string }>("SELECT md5($1) AS scope", [
      `${teamIds.join(",")}|${peers.join(",")}`
    ]);
    const scope = scopeRows[0]!.scope;
    const full = q.scope !== scope;
    const since = full ? 0 : q.since;

    const { rows } = await db.query(
      `SELECT kind, id, team_id AS "teamId", owner_id AS "ownerId", data, deleted,
              updated_at AS "updatedAt", seq::text AS seq
         FROM records
        WHERE seq > $1 AND sport = $2
          AND (team_id = ANY($3::text[]) OR owner_id = ANY($4::uuid[]))
        ORDER BY seq
        LIMIT $5`,
      [since, q.sport, teamIds, peers, PULL_LIMIT + 1]
    );
    const more = rows.length > PULL_LIMIT;
    const records = rows.slice(0, PULL_LIMIT);
    const cursor = records.length ? Number(records[records.length - 1].seq) : since;
    return {
      scope,
      full,
      cursor,
      more,
      teams,
      records: records.map(({ seq: _seq, ...r }) => r)
    };
  });

  app.post("/sync", async (req) => {
    const user = requireUser(req);
    const body = z.object({ sport: sportSchema, records: z.array(recordSchema).max(200) }).parse(req.body);
    const { rows: mine } = await db.query<{ team_id: string }>(
      `SELECT tm.team_id FROM team_members tm JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1 AND t.sport = $2`,
      [user.id, body.sport]
    );
    const myTeams = new Set(mine.map((r) => r.team_id));
    const now = Date.now();
    const rejected: { kind: string; id: string; reason: string }[] = [];
    let applied = 0;

    for (const r of body.records) {
      const data = r.data ?? null;
      if (data && JSON.stringify(data).length > MAX_DATA_BYTES) {
        rejected.push({ kind: r.kind, id: r.id, reason: "too-large" });
        continue;
      }
      // A phone with a clock far ahead must not win every conflict.
      const at = new Date(Math.min(Date.parse(r.updatedAt), now + 5 * 60_000)).toISOString();
      let teamId: string | null = null;
      let ownerId: string | null = null;
      if (r.kind === "drill") {
        ownerId = user.id;
      } else {
        teamId = r.kind === "team" ? r.id : (r.teamId ?? null);
        if (!teamId || !myTeams.has(teamId)) {
          rejected.push({ kind: r.kind, id: r.id, reason: "not-a-member" });
          continue;
        }
      }
      if (r.kind === "team" && r.deleted) {
        // Teams are removed with DELETE /teams/:id or by leaving, not by sync.
        rejected.push({ kind: r.kind, id: r.id, reason: "use-team-endpoints" });
        continue;
      }
      const res = await db.query(
        `INSERT INTO records (kind, id, sport, team_id, owner_id, data, deleted, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (kind, id) DO UPDATE
           SET data = EXCLUDED.data, deleted = EXCLUDED.deleted, updated_at = EXCLUDED.updated_at,
               updated_by = EXCLUDED.updated_by, seq = nextval('records_seq')
         WHERE records.kind <> 'note'
           AND records.updated_at <= EXCLUDED.updated_at
           AND records.team_id IS NOT DISTINCT FROM EXCLUDED.team_id
           AND records.owner_id IS NOT DISTINCT FROM EXCLUDED.owner_id
         RETURNING seq`,
        [
          r.kind,
          r.id,
          body.sport,
          teamId,
          ownerId,
          data === null ? null : JSON.stringify(data),
          r.deleted === true && r.kind !== "note",
          at,
          user.id
        ]
      );
      if (res.rowCount) applied += 1;
      else rejected.push({ kind: r.kind, id: r.id, reason: "stale-or-not-allowed" });
    }
    return { applied, rejected };
  });
}
