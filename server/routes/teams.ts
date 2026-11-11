import type { FastifyInstance } from 'fastify';
import { getClubRole, getTeamAccess, requireTeamManager, requireTeamPlanner } from '../access.js';
import { requireUser } from '../auth.js';
import { tx } from '../db.js';
import { badRequest, notFound } from '../errors.js';
import { ageSpan, loadSuggestionCandidates, suggestPractice } from '../planner.js';
import { tagsSchema, z } from '../validation.js';
import { createInvite } from './clubs.js';

const teamParam = z.object({ teamId: z.uuid() });
const teamMemberParams = z.object({ teamId: z.uuid(), userId: z.uuid() });

export default async function teamRoutes(app: FastifyInstance) {
  const { db } = app;

  app.get('/teams/:teamId', async (req) => {
    const user = requireUser(req);
    const { teamId } = teamParam.parse(req.params);
    const access = await getTeamAccess(db, user.id, teamId);
    const { rows: teamRows } = await db.query(
      `SELECT t.id, t.name, t.club_id AS "clubId", c.name AS "clubName",
              ag.id AS "ageGroupId", ag.name AS "ageGroupName", ag.target_skills AS "targetSkills",
              ag.philosophy, b.name AS "blockName", b.focus_tags AS "blockFocusTags",
              b.start_date AS "blockStart", b.end_date AS "blockEnd"
         FROM teams t
         JOIN clubs c ON c.id = t.club_id
         LEFT JOIN age_groups ag ON ag.id = t.age_group_id
         LEFT JOIN LATERAL (
           SELECT * FROM season_blocks sb
            WHERE sb.age_group_id = t.age_group_id AND current_date BETWEEN sb.start_date AND sb.end_date
            ORDER BY sb.start_date DESC LIMIT 1
         ) b ON true
        WHERE t.id = $1`,
      [teamId],
    );
    const { rows: members } = await db.query(
      `SELECT u.id, u.name, CASE WHEN $2 THEN u.email END AS email, tm.role
         FROM team_members tm JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY tm.role DESC, u.name`,
      [teamId, access.canManage],
    );
    const invites = access.canManage
      ? (
          await db.query(
            `SELECT id, role, note, created_at AS "createdAt", expires_at AS "expiresAt"
               FROM invites WHERE team_id = $1 AND used_at IS NULL AND expires_at > now()
              ORDER BY created_at DESC`,
            [teamId],
          )
        ).rows
      : [];
    return {
      ...teamRows[0],
      members,
      invites,
      access: { clubRole: access.clubRole, teamRole: access.teamRole, canPlan: access.canPlan, canManage: access.canManage },
    };
  });

  app.post('/teams/:teamId/invites', async (req, reply) => {
    const user = requireUser(req);
    const { teamId } = teamParam.parse(req.params);
    const access = await requireTeamManager(db, user.id, teamId);
    const body = z
      .object({ role: z.enum(['leader', 'coach']), note: z.string().trim().max(200).optional() })
      .parse(req.body);
    const invite = await createInvite(db, {
      clubId: access.team.club_id,
      teamId,
      role: body.role,
      note: body.note ?? '',
      createdBy: user.id,
    });
    return reply.status(201).send(invite);
  });

  // Add an existing club member to the team (no invite needed).
  app.post('/teams/:teamId/members', async (req, reply) => {
    const user = requireUser(req);
    const { teamId } = teamParam.parse(req.params);
    const access = await requireTeamManager(db, user.id, teamId);
    const body = z.object({ userId: z.uuid(), role: z.enum(['leader', 'coach']) }).parse(req.body);
    if (!(await getClubRole(db, body.userId, access.team.club_id))) {
      throw badRequest('Personen är inte med i klubben. Skicka en inbjudningslänk istället.');
    }
    await db.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [teamId, body.userId, body.role],
    );
    return reply.status(201).send({ ok: true });
  });

  app.patch('/teams/:teamId/members/:userId', async (req) => {
    const user = requireUser(req);
    const { teamId, userId } = teamMemberParams.parse(req.params);
    await requireTeamManager(db, user.id, teamId);
    const body = z.object({ role: z.enum(['leader', 'coach']) }).parse(req.body);
    const { rowCount } = await db.query(
      'UPDATE team_members SET role = $3 WHERE team_id = $1 AND user_id = $2',
      [teamId, userId, body.role],
    );
    if (!rowCount) throw notFound('Personen är inte med i laget.');
    return { ok: true };
  });

  app.delete('/teams/:teamId/members/:userId', async (req) => {
    const user = requireUser(req);
    const { teamId, userId } = teamMemberParams.parse(req.params);
    if (userId === user.id) await getTeamAccess(db, user.id, teamId);
    else await requireTeamManager(db, user.id, teamId);
    const { rowCount } = await db.query('DELETE FROM team_members WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
    if (!rowCount) throw notFound('Personen är inte med i laget.');
    return { ok: true };
  });

  // ---- Practices ----

  app.get('/teams/:teamId/practices', async (req) => {
    const user = requireUser(req);
    const { teamId } = teamParam.parse(req.params);
    await getTeamAccess(db, user.id, teamId);
    const q = z
      .object({ from: z.iso.datetime({ offset: true }).optional(), to: z.iso.datetime({ offset: true }).optional() })
      .parse(req.query);
    const { rows } = await db.query(
      `SELECT p.id, p.title, p.starts_at AS "startsAt", p.duration_min AS "durationMin", p.status,
              coalesce(sum(pi.minutes), 0)::int AS "totalMinutes", count(pi.id)::int AS "itemCount",
              (SELECT count(*)::int FROM practice_notes n WHERE n.practice_id = p.id) AS "noteCount"
         FROM practices p LEFT JOIN practice_items pi ON pi.practice_id = p.id
        WHERE p.team_id = $1
          AND ($2::timestamptz IS NULL OR p.starts_at >= $2)
          AND ($3::timestamptz IS NULL OR p.starts_at < $3)
        GROUP BY p.id
        ORDER BY p.starts_at DESC
        LIMIT 200`,
      [teamId, q.from ?? null, q.to ?? null],
    );
    return rows;
  });

  app.post('/teams/:teamId/practices', async (req, reply) => {
    const user = requireUser(req);
    const { teamId } = teamParam.parse(req.params);
    const access = await requireTeamPlanner(db, user.id, teamId);
    const body = z
      .object({
        startsAt: z.iso.datetime({ offset: true }),
        durationMin: z.number().int().min(10).max(240),
        title: z.string().trim().max(120).optional(),
        focusTags: tagsSchema.optional(),
        suggest: z.boolean().optional(),
      })
      .parse(req.body);

    // Find the age group and the season block that covers the practice date.
    const { rows } = await db.query(
      `SELECT ag.birth_year_from, ag.birth_year_to, b.focus_tags
         FROM teams t
         LEFT JOIN age_groups ag ON ag.id = t.age_group_id
         LEFT JOIN LATERAL (
           SELECT sb.focus_tags FROM season_blocks sb
            WHERE sb.age_group_id = t.age_group_id
              AND ($2::timestamptz AT TIME ZONE 'Europe/Stockholm')::date BETWEEN sb.start_date AND sb.end_date
            ORDER BY sb.start_date DESC LIMIT 1
         ) b ON true
        WHERE t.id = $1`,
      [teamId, body.startsAt],
    );
    const ctx = rows[0];
    const focusTags: string[] = body.focusTags?.length ? body.focusTags : (ctx?.focus_tags ?? []);
    const items = body.suggest
      ? suggestPractice(
          await loadSuggestionCandidates(
            db,
            access.team.club_id,
            user.id,
            ageSpan(new Date(body.startsAt).getFullYear(), ctx?.birth_year_from ?? null, ctx?.birth_year_to ?? null),
          ),
          focusTags,
          body.durationMin,
        )
      : [];

    const id = await tx(db, async (c) => {
      const { rows: created } = await c.query<{ id: string }>(
        `INSERT INTO practices (team_id, created_by, title, starts_at, duration_min, focus_tags)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [teamId, user.id, body.title ?? '', body.startsAt, body.durationMin, focusTags],
      );
      const practiceId = created[0]!.id;
      for (const [position, it] of items.entries()) {
        await c.query(
          `INSERT INTO practice_items (practice_id, position, drill_id, title, minutes, station, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [practiceId, position, it.drillId, it.title, it.minutes, it.station, it.note],
        );
      }
      return practiceId;
    });
    return reply.status(201).send({ id });
  });
}
