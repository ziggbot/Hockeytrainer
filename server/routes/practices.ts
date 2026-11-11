import type { FastifyInstance } from 'fastify';
import { getPracticeAccess } from '../access.js';
import { newToken, requireUser } from '../auth.js';
import { tx } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { loadPracticeDetails } from '../planner.js';
import { idParam, tagsSchema, z } from '../validation.js';

const itemSchema = z.object({
  drillId: z.uuid().nullable().optional(),
  title: z.string().trim().min(1).max(120),
  minutes: z.number().int().min(1).max(120),
  station: z.number().int().min(1).max(8).nullable().optional(),
  note: z.string().max(500).optional(),
});

export default async function practiceRoutes(app: FastifyInstance) {
  const { db } = app;

  async function plannerAccess(userId: string, practiceId: string) {
    const access = await getPracticeAccess(db, userId, practiceId);
    if (!access.canPlan) throw forbidden('Endast lagets ledare och tränare kan ändra träningen.');
    return access;
  }

  app.get('/practices/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const access = await getPracticeAccess(db, user.id, id);
    const [detail] = await loadPracticeDetails(db, [id], {
      includeNotes: access.canPlan,
      includeShareToken: access.canPlan,
    });
    return { ...detail, canEdit: access.canPlan };
  });

  app.patch('/practices/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    await plannerAccess(user.id, id);
    const b = z
      .object({
        title: z.string().trim().max(120).optional(),
        startsAt: z.iso.datetime({ offset: true }).optional(),
        durationMin: z.number().int().min(10).max(240).optional(),
        status: z.enum(['planned', 'done']).optional(),
        playerCount: z.number().int().min(0).max(200).nullable().optional(),
        focusTags: tagsSchema.optional(),
      })
      .parse(req.body);
    await db.query(
      `UPDATE practices SET
         title = coalesce($2, title),
         starts_at = coalesce($3, starts_at),
         duration_min = coalesce($4, duration_min),
         status = coalesce($5, status),
         player_count = CASE WHEN $6 THEN $7 ELSE player_count END,
         focus_tags = coalesce($8, focus_tags),
         updated_at = now()
       WHERE id = $1`,
      [
        id,
        b.title ?? null,
        b.startsAt ?? null,
        b.durationMin ?? null,
        b.status ?? null,
        b.playerCount !== undefined,
        b.playerCount ?? null,
        b.focusTags ?? null,
      ],
    );
    return { ok: true };
  });

  app.delete('/practices/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    await plannerAccess(user.id, id);
    await db.query('DELETE FROM practices WHERE id = $1', [id]);
    return { ok: true };
  });

  // Replaces the full running order (simplest way to support reorder/add/remove from the client).
  app.put('/practices/:id/items', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const access = await plannerAccess(user.id, id);
    const { items } = z.object({ items: z.array(itemSchema).max(40) }).parse(req.body);

    const drillIds = [...new Set(items.map((i) => i.drillId).filter((x): x is string => !!x))];
    if (drillIds.length) {
      // A drill may be used if the user can see it, or if it is already part of this practice
      // (e.g. another coach's private drill that is already in the plan).
      const { rows } = await db.query<{ id: string }>(
        `SELECT d.id FROM drills d
          WHERE d.id = ANY($1::uuid[])
            AND (d.visibility = 'public'
                 OR (d.club_id = $2 AND (d.visibility = 'club' OR d.created_by = $3))
                 OR EXISTS (SELECT 1 FROM practice_items pi WHERE pi.practice_id = $4 AND pi.drill_id = d.id))`,
        [drillIds, access.team.club_id, user.id, id],
      );
      if (rows.length !== drillIds.length) throw badRequest('En eller flera övningar finns inte eller är inte tillgängliga.');
    }

    await tx(db, async (c) => {
      await c.query('SELECT 1 FROM practices WHERE id = $1 FOR UPDATE', [id]);
      await c.query('DELETE FROM practice_items WHERE practice_id = $1', [id]);
      for (const [position, it] of items.entries()) {
        await c.query(
          `INSERT INTO practice_items (practice_id, position, drill_id, title, minutes, station, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, position, it.drillId ?? null, it.title, it.minutes, it.station ?? null, it.note ?? ''],
        );
      }
      await c.query('UPDATE practices SET updated_at = now() WHERE id = $1', [id]);
    });
    const [detail] = await loadPracticeDetails(db, [id], { includeNotes: true, includeShareToken: true });
    return { ...detail, canEdit: true };
  });

  app.post('/practices/:id/share', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    await plannerAccess(user.id, id);
    const { rows } = await db.query<{ share_token: string }>(
      `UPDATE practices SET share_token = coalesce(share_token, $2) WHERE id = $1 RETURNING share_token`,
      [id, newToken()],
    );
    return { shareToken: rows[0]!.share_token };
  });

  app.delete('/practices/:id/share', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    await plannerAccess(user.id, id);
    await db.query('UPDATE practices SET share_token = NULL WHERE id = $1', [id]);
    return { ok: true };
  });

  // Idempotent on clientId so the offline queue can safely retry.
  app.post('/practices/:id/notes', async (req, reply) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    await plannerAccess(user.id, id);
    const b = z
      .object({
        body: z.string().trim().max(4000),
        tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
        clientId: z.string().min(8).max(64).optional(),
      })
      .parse(req.body);
    if (!b.body && !b.tags?.length) throw badRequest('Skriv en anteckning eller välj en tagg.');
    await db.query(
      `INSERT INTO practice_notes (practice_id, user_id, body, tags, client_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (client_id) DO NOTHING`,
      [id, user.id, b.body, b.tags ?? [], b.clientId ?? null],
    );
    return reply.status(201).send({ ok: true });
  });

  // Next 7 days for all of my teams, with full details, so the phone can cache them for rink mode.
  app.get('/upcoming', async (req) => {
    const user = requireUser(req);
    const { rows } = await db.query<{ id: string }>(
      `SELECT p.id FROM practices p
         JOIN team_members tm ON tm.team_id = p.team_id AND tm.user_id = $1
        WHERE p.starts_at >= now() - interval '12 hours' AND p.starts_at < now() + interval '7 days'
        ORDER BY p.starts_at
        LIMIT 30`,
      [user.id],
    );
    const details = await loadPracticeDetails(db, rows.map((r) => r.id), { includeNotes: true, includeShareToken: true });
    return details.map((d) => ({ ...d, canEdit: true }));
  });

  // Public read-only view for assistants/parents. No notes, no staff names.
  app.get('/share/:token', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const { rows } = await db.query<{ id: string }>('SELECT id FROM practices WHERE share_token = $1', [token]);
    if (!rows[0]) throw notFound('Länken är ogiltig eller har stängts av.');
    const [detail] = await loadPracticeDetails(db, [rows[0].id], { includeNotes: false, includeShareToken: false });
    reply.header('cache-control', 'no-store');
    return { ...detail, canEdit: false };
  });
}
