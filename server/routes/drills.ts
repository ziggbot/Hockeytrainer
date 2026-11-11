import type { FastifyInstance } from 'fastify';
import { getClubRole, requireClubMember } from '../access.js';
import { requireUser } from '../auth.js';
import type { Queryable } from '../db.js';
import { forbidden, notFound } from '../errors.js';
import { idParam, tagsSchema, z } from '../validation.js';

const ICE_AREAS = ['full', 'half', 'third', 'station'] as const;

const drillBody = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().max(4000).optional(),
  coachingPoints: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  skillTags: tagsSchema.optional(),
  ageMin: z.number().int().min(4).max(25).nullable().optional(),
  ageMax: z.number().int().min(4).max(25).nullable().optional(),
  durationMin: z.number().int().min(1).max(120),
  iceArea: z.enum(ICE_AREAS),
  minPlayers: z.number().int().min(1).max(60).nullable().optional(),
  equipment: z
    .array(z.object({ item: z.string().trim().min(1).max(60), qty: z.number().int().min(0).max(200) }))
    .max(20)
    .optional(),
  diagramUrl: z
    .string()
    .trim()
    .max(500)
    .regex(/^https:\/\//, 'Bildlänken måste börja med https://')
    .nullable()
    .optional(),
  visibility: z.enum(['private', 'club']),
});

const DRILL_COLUMNS = `
  d.id, d.club_id AS "clubId", d.visibility, d.title, d.description, d.coaching_points AS "coachingPoints",
  d.skill_tags AS "skillTags", d.age_min AS "ageMin", d.age_max AS "ageMax", d.duration_min AS "durationMin",
  d.ice_area AS "iceArea", d.min_players AS "minPlayers", d.equipment, d.diagram_url AS "diagramUrl",
  d.created_by AS "createdBy", u.name AS "createdByName", d.updated_at AS "updatedAt"`;

interface DrillRow {
  id: string;
  clubId: string | null;
  visibility: 'private' | 'club' | 'public';
  createdBy: string | null;
  [key: string]: unknown;
}

async function loadDrill(db: Queryable, id: string): Promise<DrillRow | null> {
  const { rows } = await db.query<DrillRow>(
    `SELECT ${DRILL_COLUMNS} FROM drills d LEFT JOIN users u ON u.id = d.created_by WHERE d.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Returns { canRead, canEdit } for a drill and user. */
async function drillPermissions(db: Queryable, userId: string, d: DrillRow) {
  if (d.visibility === 'public') return { canRead: true, canEdit: false };
  const clubRole = d.clubId ? await getClubRole(db, userId, d.clubId) : null;
  if (!clubRole) return { canRead: false, canEdit: false };
  const own = d.createdBy === userId;
  if (d.visibility === 'private') return { canRead: own, canEdit: own };
  return { canRead: true, canEdit: own || clubRole === 'admin' };
}

export default async function drillRoutes(app: FastifyInstance) {
  const { db } = app;

  app.get('/drills', async (req) => {
    const user = requireUser(req);
    const q = z
      .object({
        clubId: z.uuid().optional(),
        q: z.string().trim().max(100).optional(),
        tag: z.string().trim().toLowerCase().max(40).optional(),
        age: z.coerce.number().int().min(4).max(25).optional(),
        maxDuration: z.coerce.number().int().min(1).max(120).optional(),
        iceArea: z.enum(ICE_AREAS).optional(),
      })
      .parse(req.query);
    if (q.clubId) await requireClubMember(db, user.id, q.clubId);
    const { rows } = await db.query(
      `SELECT ${DRILL_COLUMNS},
              (d.visibility <> 'public' AND (d.created_by = $2 OR (d.visibility = 'club' AND $8))) AS "canEdit"
         FROM drills d LEFT JOIN users u ON u.id = d.created_by
        WHERE (d.visibility = 'public' OR (d.club_id = $1 AND (d.visibility = 'club' OR d.created_by = $2)))
          AND ($3::text IS NULL OR d.title ILIKE '%' || $3 || '%' OR d.description ILIKE '%' || $3 || '%')
          AND ($4::text IS NULL OR $4 = ANY(d.skill_tags))
          AND ($5::int IS NULL OR ((d.age_min IS NULL OR d.age_min <= $5) AND (d.age_max IS NULL OR d.age_max >= $5)))
          AND ($6::int IS NULL OR d.duration_min <= $6)
          AND ($7::text IS NULL OR d.ice_area = $7)
        ORDER BY (d.club_id IS NULL), d.title
        LIMIT 300`,
      [
        q.clubId ?? null,
        user.id,
        q.q || null,
        q.tag || null,
        q.age ?? null,
        q.maxDuration ?? null,
        q.iceArea ?? null,
        q.clubId ? (await getClubRole(db, user.id, q.clubId)) === 'admin' : false,
      ],
    );
    return rows;
  });

  app.get('/drills/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const d = await loadDrill(db, id);
    if (!d) throw notFound('Övningen hittades inte.');
    const perm = await drillPermissions(db, user.id, d);
    if (!perm.canRead) throw notFound('Övningen hittades inte.');
    return { ...d, canEdit: perm.canEdit };
  });

  app.post('/drills', async (req, reply) => {
    const user = requireUser(req);
    const body = drillBody.extend({ clubId: z.uuid() }).parse(req.body);
    await requireClubMember(db, user.id, body.clubId);
    const { rows } = await db.query(
      `INSERT INTO drills (club_id, created_by, visibility, title, description, coaching_points, skill_tags,
                           age_min, age_max, duration_min, ice_area, min_players, equipment, diagram_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        body.clubId, user.id, body.visibility, body.title, body.description ?? '', body.coachingPoints ?? [],
        body.skillTags ?? [], body.ageMin ?? null, body.ageMax ?? null, body.durationMin, body.iceArea,
        body.minPlayers ?? null, JSON.stringify(body.equipment ?? []), body.diagramUrl ?? null,
      ],
    );
    return reply.status(201).send(rows[0]);
  });

  app.patch('/drills/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const d = await loadDrill(db, id);
    if (!d) throw notFound('Övningen hittades inte.');
    const perm = await drillPermissions(db, user.id, d);
    if (!perm.canRead) throw notFound('Övningen hittades inte.');
    if (!perm.canEdit) throw forbidden('Du kan inte ändra den här övningen. Kopiera den istället.');
    const body = drillBody.parse(req.body);
    // Only the author may change a drill's visibility (an admin must not expose someone's private drill).
    const visibility = d.createdBy === user.id ? body.visibility : d.visibility;
    await db.query(
      `UPDATE drills SET visibility = $2, title = $3, description = $4, coaching_points = $5, skill_tags = $6,
              age_min = $7, age_max = $8, duration_min = $9, ice_area = $10, min_players = $11,
              equipment = $12, diagram_url = $13, updated_at = now()
        WHERE id = $1`,
      [
        id, visibility, body.title, body.description ?? '', body.coachingPoints ?? [], body.skillTags ?? [],
        body.ageMin ?? null, body.ageMax ?? null, body.durationMin, body.iceArea, body.minPlayers ?? null,
        JSON.stringify(body.equipment ?? []), body.diagramUrl ?? null,
      ],
    );
    return { ok: true };
  });

  app.delete('/drills/:id', async (req) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const d = await loadDrill(db, id);
    if (!d) throw notFound('Övningen hittades inte.');
    const perm = await drillPermissions(db, user.id, d);
    if (!perm.canRead) throw notFound('Övningen hittades inte.');
    if (!perm.canEdit) throw forbidden('Du kan inte ta bort den här övningen.');
    await db.query('DELETE FROM drills WHERE id = $1', [id]);
    return { ok: true };
  });

  // Copy any readable drill into the club as a private drill the user can edit.
  app.post('/drills/:id/copy', async (req, reply) => {
    const user = requireUser(req);
    const { id } = idParam.parse(req.params);
    const { clubId } = z.object({ clubId: z.uuid() }).parse(req.body);
    await requireClubMember(db, user.id, clubId);
    const d = await loadDrill(db, id);
    if (!d || !(await drillPermissions(db, user.id, d)).canRead) throw notFound('Övningen hittades inte.');
    const { rows } = await db.query(
      `INSERT INTO drills (club_id, created_by, visibility, title, description, coaching_points, skill_tags,
                           age_min, age_max, duration_min, ice_area, min_players, equipment, diagram_url)
       SELECT $2, $3, 'private', left(title || ' (kopia)', 120), description, coaching_points, skill_tags,
              age_min, age_max, duration_min, ice_area, min_players, equipment, diagram_url
         FROM drills WHERE id = $1
       RETURNING id`,
      [id, clubId, user.id],
    );
    return reply.status(201).send(rows[0]);
  });
}
