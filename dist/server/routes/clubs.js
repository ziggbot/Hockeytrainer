import { getTeamAccess, requireClubAdmin, requireClubMember } from '../access.js';
import { hashToken, newToken, requireUser } from '../auth.js';
import { tx } from '../db.js';
import { badRequest, forbidden, notFound } from '../errors.js';
import { dateSchema, idParam, tagsSchema, z } from '../validation.js';
import { createClubWithAdmin } from './auth.js';
export const INVITE_DAYS = 14;
const RESET_HOURS = 72;
const clubParam = z.object({ clubId: z.uuid() });
const memberParams = z.object({ clubId: z.uuid(), userId: z.uuid() });
const ageGroupBody = z.object({
    name: z.string().trim().min(1).max(40),
    birthYearFrom: z.number().int().min(1990).max(2100).nullable().optional(),
    birthYearTo: z.number().int().min(1990).max(2100).nullable().optional(),
    targetSkills: tagsSchema.optional(),
    philosophy: z.string().max(4000).optional(),
});
const blockBody = z.object({
    name: z.string().trim().min(1).max(80),
    startDate: dateSchema,
    endDate: dateSchema,
    focusTags: tagsSchema.optional(),
});
async function countAdmins(db, clubId) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM club_members WHERE club_id = $1 AND role = 'admin'`, [clubId]);
    return rows[0].n;
}
export async function clubIdOfAgeGroup(db, id) {
    const { rows } = await db.query('SELECT club_id FROM age_groups WHERE id = $1', [id]);
    if (!rows[0])
        throw notFound('Åldersgruppen hittades inte.');
    return rows[0].club_id;
}
export async function createInvite(db, opts) {
    const token = newToken();
    const { rows } = await db.query(`INSERT INTO invites (token_hash, club_id, team_id, role, note, created_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, now() + make_interval(days => $7))
     RETURNING id, expires_at AS "expiresAt"`, [hashToken(token), opts.clubId, opts.teamId, opts.role, opts.note, opts.createdBy, INVITE_DAYS]);
    return { ...rows[0], token };
}
export default async function clubRoutes(app) {
    const { db, config } = app;
    app.post('/clubs', async (req, reply) => {
        const user = requireUser(req);
        if (!config.allowClubSignup)
            throw forbidden('Nya klubbar kan inte skapas just nu.');
        const body = z
            .object({ name: z.string().trim().min(1).max(120), region: z.string().trim().max(120).optional() })
            .parse(req.body);
        const clubId = await tx(db, (c) => createClubWithAdmin(c, user.id, body.name, body.region ?? ''));
        return reply.status(201).send({ id: clubId });
    });
    app.get('/clubs/:clubId', async (req) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        const role = await requireClubMember(db, user.id, clubId);
        const club = await db.query('SELECT id, name, region FROM clubs WHERE id = $1', [clubId]);
        const ageGroups = await db.query(`SELECT ag.id, ag.name, ag.birth_year_from AS "birthYearFrom", ag.birth_year_to AS "birthYearTo",
              ag.target_skills AS "targetSkills", ag.philosophy,
              coalesce(json_agg(json_build_object(
                'id', b.id, 'name', b.name, 'startDate', b.start_date, 'endDate', b.end_date, 'focusTags', b.focus_tags
              ) ORDER BY b.start_date) FILTER (WHERE b.id IS NOT NULL), '[]') AS blocks
         FROM age_groups ag LEFT JOIN season_blocks b ON b.age_group_id = ag.id
        WHERE ag.club_id = $1
        GROUP BY ag.id ORDER BY ag.name`, [clubId]);
        const teams = await db.query(`SELECT t.id, t.name, t.age_group_id AS "ageGroupId", ag.name AS "ageGroupName",
              (SELECT count(*)::int FROM team_members tm WHERE tm.team_id = t.id) AS "staffCount",
              (SELECT tm.role FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = $2) AS "myRole"
         FROM teams t LEFT JOIN age_groups ag ON ag.id = t.age_group_id
        WHERE t.club_id = $1 ORDER BY t.name`, [clubId, user.id]);
        return { ...club.rows[0], myRole: role, ageGroups: ageGroups.rows, teams: teams.rows };
    });
    app.patch('/clubs/:clubId', async (req) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const body = z
            .object({ name: z.string().trim().min(1).max(120), region: z.string().trim().max(120).optional() })
            .parse(req.body);
        await db.query('UPDATE clubs SET name = $2, region = $3 WHERE id = $1', [clubId, body.name, body.region ?? '']);
        return { ok: true };
    });
    // ---- Staff (lagledare & tränare) ----
    app.get('/clubs/:clubId/members', async (req) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        const role = await requireClubMember(db, user.id, clubId);
        const { rows } = await db.query(`SELECT u.id, u.name, CASE WHEN $2 THEN u.email END AS email, cm.role AS "clubRole",
              coalesce(json_agg(json_build_object('teamId', t.id, 'teamName', t.name, 'role', tm.role)
                         ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS teams
         FROM club_members cm
         JOIN users u ON u.id = cm.user_id
         LEFT JOIN team_members tm ON tm.user_id = u.id
         -- Teams from the person's other clubs become NULL here and are dropped by the FILTER.
         LEFT JOIN teams t ON t.id = tm.team_id AND t.club_id = cm.club_id
        WHERE cm.club_id = $1
        GROUP BY u.id, cm.role
        ORDER BY u.name`, [clubId, role === 'admin']);
        return rows;
    });
    app.patch('/clubs/:clubId/members/:userId', async (req) => {
        const user = requireUser(req);
        const { clubId, userId } = memberParams.parse(req.params);
        const body = z.object({ role: z.enum(['admin', 'member']) }).parse(req.body);
        await requireClubAdmin(db, user.id, clubId);
        await tx(db, async (c) => {
            await c.query('SELECT 1 FROM clubs WHERE id = $1 FOR UPDATE', [clubId]);
            const { rowCount } = await c.query('SELECT 1 FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, userId]);
            if (!rowCount)
                throw notFound('Personen är inte med i klubben.');
            if (body.role === 'member' && (await countAdmins(c, clubId)) <= 1) {
                const { rows } = await c.query(`SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`, [clubId, userId]);
                if (rows[0]?.role === 'admin')
                    throw badRequest('Klubben måste ha minst en admin.');
            }
            await c.query('UPDATE club_members SET role = $3 WHERE club_id = $1 AND user_id = $2', [clubId, userId, body.role]);
        });
        return { ok: true };
    });
    app.delete('/clubs/:clubId/members/:userId', async (req) => {
        const user = requireUser(req);
        const { clubId, userId } = memberParams.parse(req.params);
        if (userId !== user.id)
            await requireClubAdmin(db, user.id, clubId);
        else
            await requireClubMember(db, user.id, clubId);
        await tx(db, async (c) => {
            await c.query('SELECT 1 FROM clubs WHERE id = $1 FOR UPDATE', [clubId]);
            const { rows } = await c.query(`SELECT role FROM club_members WHERE club_id = $1 AND user_id = $2`, [clubId, userId]);
            if (!rows[0])
                throw notFound('Personen är inte med i klubben.');
            if (rows[0].role === 'admin' && (await countAdmins(c, clubId)) <= 1) {
                throw badRequest('Klubben måste ha minst en admin. Utse en ny admin först.');
            }
            await c.query('DELETE FROM team_members WHERE user_id = $2 AND team_id IN (SELECT id FROM teams WHERE club_id = $1)', [clubId, userId]);
            await c.query('DELETE FROM club_members WHERE club_id = $1 AND user_id = $2', [clubId, userId]);
        });
        return { ok: true };
    });
    // Without an e-mail provider, admins hand out a one-time reset link (e.g. via SMS/Spond).
    app.post('/clubs/:clubId/members/:userId/reset-link', async (req) => {
        const user = requireUser(req);
        const { clubId, userId } = memberParams.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const { rows } = await db.query(`SELECT
         EXISTS (SELECT 1 FROM club_members WHERE club_id = $1 AND user_id = $2) AS member,
         -- Only allowed if every club the person belongs to is administered by the requester.
         NOT EXISTS (
           SELECT 1 FROM club_members cm
            WHERE cm.user_id = $2
              AND cm.club_id NOT IN (SELECT club_id FROM club_members WHERE user_id = $3 AND role = 'admin')
         ) AS allowed`, [clubId, userId, user.id]);
        if (!rows[0].member)
            throw notFound('Personen är inte med i klubben.');
        if (!rows[0].allowed) {
            throw forbidden('Personen är med i en annan klubb. Be hen logga in och byta lösenord själv.');
        }
        const token = newToken();
        await db.query(`INSERT INTO password_resets (token_hash, user_id, created_by, expires_at)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`, [hashToken(token), userId, user.id, RESET_HOURS]);
        return { token, expiresInHours: RESET_HOURS };
    });
    // ---- Invites ----
    app.post('/clubs/:clubId/invites', async (req, reply) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        const body = z
            .object({
            role: z.enum(['admin', 'leader', 'coach']),
            teamId: z.uuid().nullable().optional(),
            note: z.string().trim().max(200).optional(),
        })
            .parse(req.body);
        if (body.role === 'admin') {
            if (body.teamId)
                throw badRequest('Admininbjudningar gäller hela klubben, inte ett lag.');
            await requireClubAdmin(db, user.id, clubId);
        }
        else {
            if (!body.teamId)
                throw badRequest('Välj vilket lag inbjudan gäller.');
            const access = await getTeamAccess(db, user.id, body.teamId);
            if (access.team.club_id !== clubId)
                throw notFound('Laget hittades inte.');
            if (!access.canManage)
                throw forbidden('Endast lagledare eller klubbadmin kan bjuda in.');
        }
        const invite = await createInvite(db, {
            clubId,
            teamId: body.teamId ?? null,
            role: body.role,
            note: body.note ?? '',
            createdBy: user.id,
        });
        return reply.status(201).send(invite);
    });
    app.get('/clubs/:clubId/invites', async (req) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const { rows } = await db.query(`SELECT i.id, i.role, i.note, i.team_id AS "teamId", t.name AS "teamName",
              i.created_at AS "createdAt", i.expires_at AS "expiresAt", u.name AS "createdByName"
         FROM invites i LEFT JOIN teams t ON t.id = i.team_id LEFT JOIN users u ON u.id = i.created_by
        WHERE i.club_id = $1 AND i.used_at IS NULL AND i.expires_at > now()
        ORDER BY i.created_at DESC`, [clubId]);
        return rows;
    });
    app.delete('/invites/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        const { rows } = await db.query('SELECT club_id, team_id FROM invites WHERE id = $1', [id]);
        const inv = rows[0];
        if (!inv)
            throw notFound('Inbjudan hittades inte.');
        if (inv.team_id) {
            const access = await getTeamAccess(db, user.id, inv.team_id);
            if (!access.canManage)
                throw forbidden();
        }
        else {
            await requireClubAdmin(db, user.id, inv.club_id);
        }
        await db.query('DELETE FROM invites WHERE id = $1', [id]);
        return { ok: true };
    });
    // ---- Age groups & season blocks (curriculum) ----
    app.post('/clubs/:clubId/age-groups', async (req, reply) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const b = ageGroupBody.parse(req.body);
        const { rows } = await db.query(`INSERT INTO age_groups (club_id, name, birth_year_from, birth_year_to, target_skills, philosophy)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [clubId, b.name, b.birthYearFrom ?? null, b.birthYearTo ?? null, b.targetSkills ?? [], b.philosophy ?? '']);
        return reply.status(201).send(rows[0]);
    });
    app.patch('/age-groups/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        await requireClubAdmin(db, user.id, await clubIdOfAgeGroup(db, id));
        const b = ageGroupBody.parse(req.body);
        await db.query(`UPDATE age_groups SET name = $2, birth_year_from = $3, birth_year_to = $4, target_skills = $5, philosophy = $6
        WHERE id = $1`, [id, b.name, b.birthYearFrom ?? null, b.birthYearTo ?? null, b.targetSkills ?? [], b.philosophy ?? '']);
        return { ok: true };
    });
    app.delete('/age-groups/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        await requireClubAdmin(db, user.id, await clubIdOfAgeGroup(db, id));
        await db.query('DELETE FROM age_groups WHERE id = $1', [id]);
        return { ok: true };
    });
    app.post('/age-groups/:id/blocks', async (req, reply) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        await requireClubAdmin(db, user.id, await clubIdOfAgeGroup(db, id));
        const b = blockBody.parse(req.body);
        if (b.endDate < b.startDate)
            throw badRequest('Slutdatum måste vara efter startdatum.');
        const { rows } = await db.query(`INSERT INTO season_blocks (age_group_id, name, start_date, end_date, focus_tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`, [id, b.name, b.startDate, b.endDate, b.focusTags ?? []]);
        return reply.status(201).send(rows[0]);
    });
    async function clubIdOfBlock(id) {
        const { rows } = await db.query('SELECT ag.club_id FROM season_blocks b JOIN age_groups ag ON ag.id = b.age_group_id WHERE b.id = $1', [id]);
        if (!rows[0])
            throw notFound('Blocket hittades inte.');
        return rows[0].club_id;
    }
    app.patch('/blocks/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        await requireClubAdmin(db, user.id, await clubIdOfBlock(id));
        const b = blockBody.parse(req.body);
        if (b.endDate < b.startDate)
            throw badRequest('Slutdatum måste vara efter startdatum.');
        await db.query('UPDATE season_blocks SET name = $2, start_date = $3, end_date = $4, focus_tags = $5 WHERE id = $1', [id, b.name, b.startDate, b.endDate, b.focusTags ?? []]);
        return { ok: true };
    });
    app.delete('/blocks/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        await requireClubAdmin(db, user.id, await clubIdOfBlock(id));
        await db.query('DELETE FROM season_blocks WHERE id = $1', [id]);
        return { ok: true };
    });
    // ---- Teams (create/rename/delete is club admin work) ----
    const teamBody = z.object({ name: z.string().trim().min(1).max(80), ageGroupId: z.uuid().nullable().optional() });
    async function assertAgeGroupInClub(ageGroupId, clubId) {
        if (!ageGroupId)
            return;
        if ((await clubIdOfAgeGroup(db, ageGroupId)) !== clubId)
            throw badRequest('Åldersgruppen tillhör en annan klubb.');
    }
    app.post('/clubs/:clubId/teams', async (req, reply) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const b = teamBody.parse(req.body);
        await assertAgeGroupInClub(b.ageGroupId, clubId);
        const { rows } = await db.query('INSERT INTO teams (club_id, name, age_group_id) VALUES ($1, $2, $3) RETURNING id', [clubId, b.name, b.ageGroupId ?? null]);
        return reply.status(201).send(rows[0]);
    });
    app.patch('/teams/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        const access = await getTeamAccess(db, user.id, id);
        if (access.clubRole !== 'admin')
            throw forbidden('Endast klubbadmin kan ändra lag.');
        const b = teamBody.parse(req.body);
        await assertAgeGroupInClub(b.ageGroupId, access.team.club_id);
        await db.query('UPDATE teams SET name = $2, age_group_id = $3 WHERE id = $1', [id, b.name, b.ageGroupId ?? null]);
        return { ok: true };
    });
    app.delete('/teams/:id', async (req) => {
        const user = requireUser(req);
        const { id } = idParam.parse(req.params);
        const access = await getTeamAccess(db, user.id, id);
        if (access.clubRole !== 'admin')
            throw forbidden('Endast klubbadmin kan ta bort lag.');
        await db.query('DELETE FROM teams WHERE id = $1', [id]);
        return { ok: true };
    });
    // ---- Admin overview: what each team planned against its current focus block ----
    app.get('/clubs/:clubId/overview', async (req) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const { rows } = await db.query(`WITH team_period AS (
         SELECT t.id, t.name, ag.name AS age_group_name,
                b.name AS block_name, b.focus_tags,
                coalesce(b.start_date, current_date - 28) AS period_start,
                coalesce(b.end_date, current_date + 28) AS period_end
           FROM teams t
           LEFT JOIN age_groups ag ON ag.id = t.age_group_id
           LEFT JOIN LATERAL (
             SELECT * FROM season_blocks sb
              WHERE sb.age_group_id = t.age_group_id AND current_date BETWEEN sb.start_date AND sb.end_date
              ORDER BY sb.start_date DESC LIMIT 1
           ) b ON true
          WHERE t.club_id = $1
       )
       SELECT tp.id AS "teamId", tp.name AS "teamName", tp.age_group_name AS "ageGroupName",
              tp.block_name AS "blockName", coalesce(tp.focus_tags, '{}') AS "focusTags",
              tp.period_start AS "periodStart", tp.period_end AS "periodEnd",
              count(DISTINCT p.id) FILTER (WHERE p.status = 'planned')::int AS planned,
              count(DISTINCT p.id) FILTER (WHERE p.status = 'done')::int AS done,
              coalesce(array_agg(DISTINCT tag) FILTER (WHERE tag IS NOT NULL), '{}') AS "tagsUsed"
         FROM team_period tp
         LEFT JOIN practices p ON p.team_id = tp.id
              AND p.starts_at::date BETWEEN tp.period_start AND tp.period_end
         LEFT JOIN practice_items pi ON pi.practice_id = p.id
         LEFT JOIN drills d ON d.id = pi.drill_id
         LEFT JOIN LATERAL unnest(d.skill_tags) AS tag ON true
        GROUP BY tp.id, tp.name, tp.age_group_name, tp.block_name, tp.focus_tags, tp.period_start, tp.period_end
        ORDER BY tp.name`, [clubId]);
        return rows.map((r) => ({
            ...r,
            focusCovered: r.focusTags.filter((t) => r.tagsUsed.includes(t)),
        }));
    });
    // ---- Backup: full JSON export of the club's data (no password hashes) ----
    app.get('/clubs/:clubId/export', async (req, reply) => {
        const user = requireUser(req);
        const { clubId } = clubParam.parse(req.params);
        await requireClubAdmin(db, user.id, clubId);
        const q = async (sql) => (await db.query(sql, [clubId])).rows;
        const data = {
            format: 'hockeytrainer-club-export',
            version: 1,
            exportedAt: new Date().toISOString(),
            club: (await q('SELECT id, name, region, created_at FROM clubs WHERE id = $1'))[0],
            members: await q(`SELECT u.id, u.name, u.email, cm.role FROM club_members cm JOIN users u ON u.id = cm.user_id WHERE cm.club_id = $1`),
            ageGroups: await q('SELECT * FROM age_groups WHERE club_id = $1'),
            seasonBlocks: await q('SELECT sb.* FROM season_blocks sb JOIN age_groups ag ON ag.id = sb.age_group_id WHERE ag.club_id = $1'),
            teams: await q('SELECT * FROM teams WHERE club_id = $1'),
            teamMembers: await q('SELECT tm.* FROM team_members tm JOIN teams t ON t.id = tm.team_id WHERE t.club_id = $1'),
            drills: await q(`SELECT * FROM drills WHERE club_id = $1 AND visibility = 'club'`),
            practices: await q('SELECT p.id, p.team_id, p.title, p.starts_at, p.duration_min, p.status, p.player_count, p.focus_tags, p.created_at FROM practices p JOIN teams t ON t.id = p.team_id WHERE t.club_id = $1'),
            practiceItems: await q('SELECT pi.* FROM practice_items pi JOIN practices p ON p.id = pi.practice_id JOIN teams t ON t.id = p.team_id WHERE t.club_id = $1'),
            practiceNotes: await q('SELECT n.id, n.practice_id, n.user_id, n.body, n.tags, n.created_at FROM practice_notes n JOIN practices p ON p.id = n.practice_id JOIN teams t ON t.id = p.team_id WHERE t.club_id = $1'),
        };
        const date = new Date().toISOString().slice(0, 10);
        reply.header('content-disposition', `attachment; filename="hockeytrainer-backup-${date}.json"`);
        reply.header('cache-control', 'no-store');
        return data;
    });
}
//# sourceMappingURL=clubs.js.map