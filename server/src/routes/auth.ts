import type { FastifyInstance } from "fastify";
import { LoginThrottle, bearerToken, createToken, hashPassword, hashToken, requireUser, verifyPassword } from "../auth.js";
import { tx } from "../db.js";
import { badRequest, conflict, HttpError, unauthorized } from "../errors.js";
import { emailSchema, nameSchema, passwordSchema, z } from "../validation.js";

// Keeps login timing similar whether or not the e-mail exists.
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export default async function authRoutes(app: FastifyInstance) {
  const { db, config } = app;
  const AUTH_RATE_LIMIT = { rateLimit: { max: config.authRateLimitMax, timeWindow: "1 minute" } };
  const throttle = new LoginThrottle();

  app.post("/auth/register", { config: AUTH_RATE_LIMIT }, async (req, reply) => {
    const body = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema }).parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const result = await tx(db, async (c) => {
      const existing = await c.query("SELECT 1 FROM users WHERE lower(email) = $1", [body.email]);
      if (existing.rowCount) throw conflict("E-postadressen har redan ett konto. Logga in istället.");
      const { rows } = await c.query<{ id: string }>(
        "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id",
        [body.email, body.name, passwordHash]
      );
      const id = rows[0]!.id;
      return { token: await createToken(c, id), user: { id, name: body.name, email: body.email } };
    });
    return reply.status(201).send(result);
  });

  app.post("/auth/login", { config: AUTH_RATE_LIMIT }, async (req) => {
    const body = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).parse(req.body);
    if (throttle.isBlocked(body.email)) {
      throw new HttpError(
        429,
        "För många misslyckade inloggningar. Vänta 15 minuter eller be huvudtränaren om en återställningslänk."
      );
    }
    const { rows } = await db.query<{ id: string; name: string; email: string; password_hash: string }>(
      "SELECT id, name, email, password_hash FROM users WHERE lower(email) = $1",
      [body.email]
    );
    const user = rows[0];
    const ok = await verifyPassword(body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      throttle.fail(body.email);
      throw unauthorized("Fel e-post eller lösenord.");
    }
    throttle.reset(body.email);
    return { token: await createToken(db, user.id), user: { id: user.id, name: user.name, email: user.email } };
  });

  app.post("/auth/logout", async (req) => {
    const token = bearerToken(req);
    if (token) await db.query("DELETE FROM auth_tokens WHERE id = $1", [hashToken(token)]);
    return { ok: true };
  });

  app.get("/me", async (req) => {
    const user = requireUser(req);
    const { rows } = await db.query(
      `SELECT tm.team_id AS id, tm.role, t.sport FROM team_members tm JOIN teams t ON t.id = tm.team_id
        WHERE tm.user_id = $1 ORDER BY tm.created_at`,
      [user.id]
    );
    return { user, teams: rows };
  });

  app.patch("/me", async (req) => {
    const user = requireUser(req);
    const body = z.object({ name: nameSchema }).parse(req.body);
    await db.query("UPDATE users SET name = $2 WHERE id = $1", [user.id, body.name]);
    return { ok: true };
  });

  app.post("/me/password", { config: AUTH_RATE_LIMIT }, async (req) => {
    const user = requireUser(req);
    const body = z.object({ currentPassword: z.string().min(1).max(200), newPassword: passwordSchema }).parse(req.body);
    const { rows } = await db.query<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!(await verifyPassword(body.currentPassword, rows[0]!.password_hash))) {
      throw badRequest("Nuvarande lösenord stämmer inte.");
    }
    await db.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, await hashPassword(body.newPassword)]);
    // Sign out every other device.
    await db.query("DELETE FROM auth_tokens WHERE user_id = $1 AND id <> $2", [user.id, hashToken(bearerToken(req) ?? "")]);
    return { ok: true };
  });

  // ── Password reset links (made by a head coach, see routes/teams.ts) ──

  app.get("/resets/:token", { config: AUTH_RATE_LIMIT }, async (req) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const { rows } = await db.query(
      `SELECT u.name FROM password_resets r JOIN users u ON u.id = r.user_id
        WHERE r.token_hash = $1 AND r.used_at IS NULL AND r.expires_at > now()`,
      [hashToken(token)]
    );
    return rows[0] ? { valid: true, name: rows[0].name } : { valid: false };
  });

  app.post("/resets/:token", { config: AUTH_RATE_LIMIT }, async (req) => {
    const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.params);
    const body = z.object({ password: passwordSchema }).parse(req.body);
    const passwordHash = await hashPassword(body.password);
    return tx(db, async (c) => {
      const { rows } = await c.query<{ user_id: string }>(
        `UPDATE password_resets SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
          RETURNING user_id`,
        [hashToken(token)]
      );
      const userId = rows[0]?.user_id;
      if (!userId) throw badRequest("Länken är ogiltig, redan använd eller har gått ut.");
      await c.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
      await c.query("DELETE FROM auth_tokens WHERE user_id = $1", [userId]);
      const user = (await c.query("SELECT id, name, email FROM users WHERE id = $1", [userId])).rows[0];
      return { token: await createToken(c, userId), user };
    });
  });
}
