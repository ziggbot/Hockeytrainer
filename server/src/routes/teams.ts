import type { FastifyInstance } from "fastify";
import { countHeads, requireHead, requireMember, teamRole } from "../access.js";
import { hashToken, newToken, requireUser } from "../auth.js";
import type { Client } from "../db.js";
import { tx } from "../db.js";
import { badRequest, conflict, forbidden, notFound } from "../errors.js";
import { z } from "../validation.js";
import { MAX_DATA_BYTES, sportSchema } from "./sync.js";

const INVITE_DAYS = 7;
const INVITE_USES = 10;
const RESET_HOURS = 72;

const teamParam = z.object({ id: z.string().min(1).max(100) });
const memberParams = z.object({ id: z.string().min(1).max(100), userId: z.uuid() });
const tokenParam = z.object({ token: z.string().min(10).max(200) });

/** Removes a member; deletes the team when nobody is left. */
async function removeMember(c: Client, teamId: string, userId: string) {
  await c.query("SELECT 1 FROM teams WHERE id = $1 FOR UPDATE", [teamId]);
  const role = await teamRole(c, userId, teamId);
  if (!role) throw notFound("Personen är inte med i laget.");
  const { rows } = await c.query<{ n: number }>("SELECT count(*)::int AS n FROM team_members WHERE team_id = $1", [teamId]);
  if (rows[0]!.n === 1) {
    await c.query("DELETE FROM teams WHERE id = $1", [teamId]);
    return;
  }
  if (role === "head" && (await countHeads(c, teamId)) === 1) {
    throw badRequest("Laget behöver en huvudtränare. Gör någon annan till huvudtränare först.");
  }
  await c.query("DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", [teamId, userId]);
}

export default async function teamRoutes(app: FastifyInstance) {
  const { db } = app;

  // Links a team from the app to the account. The creator becomes head coach.
  app.post("/teams", async (req, reply) => {
    const user = requireUser(req);
    const body = z
      .object({ id: z.string().min(1).max(100), sport: sportSchema, data: z.record(z.string(), z.unknown()) })
      .parse(req.body);
    if (JSON.stringify(body.data).length > MAX_DATA_BYTES) throw badRequest("För mycket data.");
    const role = await tx(db, async (c) => {
      const existing = await c.query("SELECT 1 FROM teams WHERE id = $1 FOR UPDATE", [body.id]);
      if (existing.rowCount) {
        const role = await teamRole(c, user.id, body.id);
        if (!role) throw conflict("Laget finns redan.");
        return role;
      }
      await c.query("INSERT INTO teams (id, sport, created_by) VALUES ($1, $2, $3)", [body.id, body.sport, user.id]);
      await c.query("INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'head')", [body.id, user.id]);
      await c.query(
        `INSERT INTO records (kind, id, sport, team_id, data, updated_at, updated_by)
         VALUES ('team', $1, $2, $1, $3, now(), $4)`,
        [body.id, body.sport, JSON.stringify(body.data), user.id]
      );
      return "head" as const;
    });
    return reply.status(201).send({ id: body.id, role });
  });

  app.get("/teams/:id/members", async (req) => {
    const user = requireUser(req);
    const { id } = teamParam.parse(req.params);
    await requireMember(db, user.id, id);
    const { rows } = await db.query(
      `SELECT u.id, u.name, tm.role FROM team_members tm JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = $1 ORDER BY tm.role DESC, tm.created_at`,
      [id]
    );
    return rows;
  });

  app.patch("/teams/:id/members/:userId", async (req) => {
    const user = requireUser(req);
    const { id, userId } = memberParams.parse(req.params);
    const { role } = z.object({ role: z.enum(["head", "coach"]) }).parse(req.body);
    await requireHead(db, user.id, id);
    await tx(db, async (c) => {
      await c.query("SELECT 1 FROM teams WHERE id = $1 FOR UPDATE", [id]);
      const current = await teamRole(c, userId, id);
      if (!current) throw notFound("Personen är inte med i laget.");
      if (current === "head" && role === "coach" && (await countHeads(c, id)) === 1) {
        throw badRequest("Laget behöver en huvudtränare. Gör någon annan till huvudtränare först.");
      }
      await c.query("UPDATE team_members SET role = $3 WHERE team_id = $1 AND user_id = $2", [id, userId, role]);
    });
    return { ok: true };
  });

  // Head coach removes a coach, or anyone leaves the team themselves.
  app.delete("/teams/:id/members/:userId", async (req) => {
    const user = requireUser(req);
    const { id, userId } = memberParams.parse(req.params);
    if (userId === user.id) await requireMember(db, user.id, id);
    else await requireHead(db, user.id, id);
    await tx(db, (c) => removeMember(c, id, userId));
    return { ok: true };
  });

  app.delete("/teams/:id", async (req) => {
    const user = requireUser(req);
    const { id } = teamParam.parse(req.params);
    await requireHead(db, user.id, id);
    await db.query("DELETE FROM teams WHERE id = $1", [id]);
    return { ok: true };
  });

  // ── Invites ──

  app.post("/teams/:id/invites", async (req, reply) => {
    const user = requireUser(req);
    const { id } = teamParam.parse(req.params);
    const body = z.object({ role: z.enum(["head", "coach"]).optional() }).parse(req.body ?? {});
    await requireHead(db, user.id, id);
    const token = newToken();
    const { rows } = await db.query(
      `INSERT INTO invites (token_hash, team_id, role, created_by, expires_at, max_uses)
       VALUES ($1, $2, $3, $4, now() + make_interval(days => $5), $6)
       RETURNING id, expires_at AS "expiresAt", max_uses AS "maxUses"`,
      [hashToken(token), id, body.role ?? "coach", user.id, INVITE_DAYS, INVITE_USES]
    );
    return reply.status(201).send({ ...rows[0], token });
  });

  app.get("/teams/:id/invites", async (req) => {
    const user = requireUser(req);
    const { id } = teamParam.parse(req.params);
    await requireHead(db, user.id, id);
    const { rows } = await db.query(
      `SELECT id, role, created_at AS "createdAt", expires_at AS "expiresAt", uses, max_uses AS "maxUses"
         FROM invites
        WHERE team_id = $1 AND revoked_at IS NULL AND expires_at > now() AND uses < max_uses
        ORDER BY created_at DESC`,
      [id]
    );
    return rows;
  });

  app.delete("/invites/:id", async (req) => {
    const user = requireUser(req);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { rows } = await db.query<{ team_id: string }>("SELECT team_id FROM invites WHERE id = $1", [id]);
    if (!rows[0]) throw notFound("Inbjudan hittades inte.");
    await requireHead(db, user.id, rows[0].team_id);
    await db.query("UPDATE invites SET revoked_at = now() WHERE id = $1", [id]);
    return { ok: true };
  });

  // Public: what the invite is for, so the invited coach knows what they join.
  app.get("/invites/:token", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const { token } = tokenParam.parse(req.params);
    const { rows } = await db.query(
      `SELECT i.role, t.sport, r.data->>'name' AS "teamName", u.name AS "invitedBy",
              (i.revoked_at IS NULL AND i.expires_at > now() AND i.uses < i.max_uses) AS valid
         FROM invites i
         JOIN teams t ON t.id = i.team_id
         LEFT JOIN records r ON r.kind = 'team' AND r.id = i.team_id
         LEFT JOIN users u ON u.id = i.created_by
        WHERE i.token_hash = $1`,
      [hashToken(token)]
    );
    const inv = rows[0];
    if (!inv?.valid) return { valid: false };
    return { valid: true, role: inv.role, sport: inv.sport, teamName: inv.teamName ?? "", invitedBy: inv.invitedBy ?? "" };
  });

  app.post("/invites/:token/accept", async (req) => {
    const user = requireUser(req);
    const { token } = tokenParam.parse(req.params);
    return tx(db, async (c) => {
      const { rows } = await c.query<{ id: string; team_id: string; role: "head" | "coach"; sport: string }>(
        `SELECT i.id, i.team_id, i.role, t.sport FROM invites i JOIN teams t ON t.id = i.team_id
          WHERE i.token_hash = $1 AND i.revoked_at IS NULL AND i.expires_at > now() AND i.uses < i.max_uses
          FOR UPDATE OF i`,
        [hashToken(token)]
      );
      const inv = rows[0];
      if (!inv) throw badRequest("Inbjudan är ogiltig, redan använd eller har gått ut. Be om en ny länk.");
      // Never downgrade a head coach through an invite.
      const res = await c.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
         ON CONFLICT (team_id, user_id) DO UPDATE
           SET role = CASE WHEN team_members.role = 'head' THEN 'head' ELSE EXCLUDED.role END
         RETURNING (xmax = 0) AS inserted`,
        [inv.team_id, user.id, inv.role]
      );
      if (res.rows[0]?.inserted) await c.query("UPDATE invites SET uses = uses + 1 WHERE id = $1", [inv.id]);
      return { teamId: inv.team_id, sport: inv.sport };
    });
  });

  // No e-mail service: the head coach hands a one-time reset link to a coach.
  app.post("/teams/:id/members/:userId/reset-link", async (req) => {
    const user = requireUser(req);
    const { id, userId } = memberParams.parse(req.params);
    await requireHead(db, user.id, id);
    if (userId === user.id) throw badRequest("Byt ditt eget lösenord under Laget.");
    const { rows } = await db.query(
      `SELECT
         EXISTS (SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2) AS member,
         -- Allowed only if every team the person is in has the requester as head coach.
         NOT EXISTS (
           SELECT 1 FROM team_members tm
            WHERE tm.user_id = $2
              AND tm.team_id NOT IN (SELECT team_id FROM team_members WHERE user_id = $3 AND role = 'head')
         ) AS allowed`,
      [id, userId, user.id]
    );
    if (!rows[0].member) throw notFound("Personen är inte med i laget.");
    if (!rows[0].allowed) throw forbidden("Personen är med i ett annat lag. Be hen byta lösenord själv.");
    const token = newToken();
    await db.query(
      `INSERT INTO password_resets (token_hash, user_id, created_by, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
      [hashToken(token), userId, user.id, RESET_HOURS]
    );
    return { token, expiresInHours: RESET_HOURS };
  });
}
