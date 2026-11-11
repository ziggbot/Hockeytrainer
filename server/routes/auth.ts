import type { FastifyInstance } from 'fastify';
import {
  clearSessionCookie,
  createSession,
  hashPassword,
  hashToken,
  requireUser,
  SESSION_COOKIE,
  setSessionCookie,
  verifyPassword,
} from '../auth.js';
import type { Client, Queryable } from '../db.js';
import { tx } from '../db.js';
import { badRequest, conflict, forbidden, unauthorized } from '../errors.js';
import { emailSchema, nameSchema, passwordSchema, z } from '../validation.js';

// Used to keep login timing similar whether or not the e-mail exists.
const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

interface InviteRow {
  id: string;
  club_id: string;
  team_id: string | null;
  role: 'admin' | 'leader' | 'coach';
}

/** Locks and returns a usable invite, or null if it is unknown, used or expired. */
async function lockInvite(c: Client, token: string): Promise<InviteRow | null> {
  const { rows } = await c.query<InviteRow>(
    `SELECT id, club_id, team_id, role FROM invites
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      FOR UPDATE`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function applyInvite(c: Client, invite: InviteRow, userId: string): Promise<void> {
  await c.query(
    `INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (club_id, user_id) DO UPDATE
       SET role = CASE WHEN club_members.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END`,
    [invite.club_id, userId, invite.role === 'admin' ? 'admin' : 'member'],
  );
  if (invite.team_id) {
    // Never downgrade an existing leader to coach through an invite.
    await c.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (team_id, user_id) DO UPDATE
         SET role = CASE WHEN team_members.role = 'leader' THEN 'leader' ELSE EXCLUDED.role END`,
      [invite.team_id, userId, invite.role],
    );
  }
  await c.query('UPDATE invites SET used_at = now(), used_by = $2 WHERE id = $1', [invite.id, userId]);
}

export async function createClubWithAdmin(db: Queryable, userId: string, name: string, region: string) {
  const { rows } = await db.query<{ id: string }>(
    'INSERT INTO clubs (name, region) VALUES ($1, $2) RETURNING id',
    [name, region],
  );
  const clubId = rows[0]!.id;
  await db.query(`INSERT INTO club_members (club_id, user_id, role) VALUES ($1, $2, 'admin')`, [clubId, userId]);
  return clubId;
}

export default async function authRoutes(app: FastifyInstance) {
  const { db, config } = app;
  const AUTH_RATE_LIMIT = { rateLimit: { max: config.authRateLimitMax, timeWindow: '1 minute' } };

  app.post('/auth/register', { config: AUTH_RATE_LIMIT }, async (req, reply) => {
    const body = z
      .object({
        name: nameSchema,
        email: emailSchema,
        password: passwordSchema,
        clubName: z.string().trim().min(1).max(120).optional(),
        region: z.string().trim().max(120).optional(),
        inviteToken: z.string().min(10).max(200).optional(),
      })
      .parse(req.body);

    if (!body.inviteToken && !body.clubName) {
      throw badRequest('Ange ett klubbnamn eller använd en inbjudningslänk.');
    }
    if (!body.inviteToken && !config.allowClubSignup) {
      throw forbidden('Nya klubbar kan inte skapas just nu. Be din klubbadmin om en inbjudningslänk.');
    }

    const passwordHash = await hashPassword(body.password);
    const result = await tx(db, async (c) => {
      const invite = body.inviteToken ? await lockInvite(c, body.inviteToken) : null;
      if (body.inviteToken && !invite) throw badRequest('Inbjudan är ogiltig, redan använd eller har gått ut.');

      const existing = await c.query('SELECT 1 FROM users WHERE lower(email) = $1', [body.email]);
      if (existing.rowCount) throw conflict('E-postadressen är redan registrerad. Logga in istället.');

      const { rows } = await c.query<{ id: string }>(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [body.email, body.name, passwordHash],
      );
      const userId = rows[0]!.id;
      let clubId: string;
      if (invite) {
        await applyInvite(c, invite, userId);
        clubId = invite.club_id;
      } else {
        clubId = await createClubWithAdmin(c, userId, body.clubName!, body.region ?? '');
      }
      const token = await createSession(c, userId);
      return { token, clubId, teamId: invite?.team_id ?? null };
    });

    setSessionCookie(reply, result.token, config.cookieSecure);
    return reply.status(201).send({ clubId: result.clubId, teamId: result.teamId });
  });

  app.post('/auth/login', { config: AUTH_RATE_LIMIT }, async (req, reply) => {
    const body = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).parse(req.body);
    const { rows } = await db.query<{ id: string; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE lower(email) = $1',
      [body.email],
    );
    const user = rows[0];
    const ok = await verifyPassword(body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Fel e-post eller lösenord.');
    const token = await createSession(db, user.id);
    setSessionCookie(reply, token, config.cookieSecure);
    return { ok: true };
  });

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await db.query('DELETE FROM auth_sessions WHERE id = $1', [hashToken(token)]);
    clearSessionCookie(reply, config.cookieSecure);
    return { ok: true };
  });

  app.get('/me', async (req) => {
    const user = requireUser(req);
    const clubs = await db.query(
      `SELECT c.id, c.name, c.region, cm.role
         FROM club_members cm JOIN clubs c ON c.id = cm.club_id
        WHERE cm.user_id = $1 ORDER BY c.name`,
      [user.id],
    );
    const teams = await db.query(
      `SELECT t.id, t.name, t.club_id AS "clubId", ag.name AS "ageGroupName", tm.role
         FROM team_members tm
         JOIN teams t ON t.id = tm.team_id
         LEFT JOIN age_groups ag ON ag.id = t.age_group_id
        WHERE tm.user_id = $1 ORDER BY t.name`,
      [user.id],
    );
    return {
      user,
      clubs: clubs.rows,
      teams: teams.rows,
      allowClubSignup: config.allowClubSignup,
    };
  });

  app.patch('/me', async (req) => {
    const user = requireUser(req);
    const body = z.object({ name: nameSchema }).parse(req.body);
    await db.query('UPDATE users SET name = $2 WHERE id = $1', [user.id, body.name]);
    return { ok: true };
  });

  app.post('/me/password', { config: AUTH_RATE_LIMIT }, async (req) => {
    const user = requireUser(req);
    const body = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema }).parse(req.body);
    const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [user.id]);
    if (!(await verifyPassword(body.currentPassword, rows[0]!.password_hash))) {
      throw badRequest('Nuvarande lösenord stämmer inte.');
    }
    await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [user.id, await hashPassword(body.newPassword)]);
    // Log out every other device.
    const current = hashToken(req.cookies[SESSION_COOKIE] ?? '');
    await db.query('DELETE FROM auth_sessions WHERE user_id = $1 AND id <> $2', [user.id, current]);
    return { ok: true };
  });

  // ---- Invites (public lookup + accept for logged-in users) ----

  app.get('/invites/:token', { config: AUTH_RATE_LIMIT }, async (req) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const { rows } = await db.query(
      `SELECT i.role, i.used_at IS NOT NULL AS used, i.expires_at < now() AS expired,
              c.name AS "clubName", t.name AS "teamName"
         FROM invites i JOIN clubs c ON c.id = i.club_id LEFT JOIN teams t ON t.id = i.team_id
        WHERE i.token_hash = $1`,
      [hashToken(token)],
    );
    const inv = rows[0];
    if (!inv) return { valid: false };
    return {
      valid: !inv.used && !inv.expired,
      role: inv.role,
      clubName: inv.clubName,
      teamName: inv.teamName,
    };
  });

  app.post('/invites/:token/accept', async (req) => {
    const user = requireUser(req);
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    return tx(db, async (c) => {
      const invite = await lockInvite(c, token);
      if (!invite) throw badRequest('Inbjudan är ogiltig, redan använd eller har gått ut.');
      await applyInvite(c, invite, user.id);
      return { clubId: invite.club_id, teamId: invite.team_id };
    });
  });

  // ---- Password reset links (created by a club admin) ----

  app.get('/resets/:token', { config: AUTH_RATE_LIMIT }, async (req) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const { rows } = await db.query(
      `SELECT u.name FROM password_resets r JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()`,
      [hashToken(token)],
    );
    return rows[0] ? { valid: true, name: rows[0].name } : { valid: false };
  });

  app.post('/resets/:token', { config: AUTH_RATE_LIMIT }, async (req, reply) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const body = z.object({ password: passwordSchema }).parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const sessionToken = await tx(db, async (c) => {
      const { rows } = await c.query<{ user_id: string }>(
        `UPDATE password_resets SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
          RETURNING user_id`,
        [hashToken(token)],
      );
      const userId = rows[0]?.user_id;
      if (!userId) throw badRequest('Länken är ogiltig, redan använd eller har gått ut.');
      await c.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
      await c.query('DELETE FROM auth_sessions WHERE user_id = $1', [userId]);
      return createSession(c, userId);
    });
    setSessionCookie(reply, sessionToken, config.cookieSecure);
    return { ok: true };
  });
}
