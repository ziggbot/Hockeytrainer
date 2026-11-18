import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyError } from "fastify";
import { ZodError } from "zod";
import { bearerToken, loadUser } from "./auth.js";
import type { Config } from "./config.js";
import type { Pool } from "./db.js";
import { HttpError } from "./errors.js";
import authRoutes from "./routes/auth.js";
import syncRoutes from "./routes/sync.js";
import teamRoutes from "./routes/teams.js";
import { formatZodError } from "./validation.js";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
    config: Config;
  }
}

export async function buildApp(opts: { pool: Pool; config: Config; logger?: boolean }) {
  const app = Fastify({
    logger: opts.logger ?? true,
    // Render terminates TLS in front of the service. Client IPs from
    // X-Forwarded-For are best effort (forgeable); logins are also throttled per account.
    trustProxy: true,
    bodyLimit: 2 * 1024 * 1024
  });
  app.decorate("db", opts.pool);
  app.decorate("config", opts.config);
  app.decorateRequest("user", null);

  // The web apps are static sites on other origins; they send a bearer token, never cookies.
  await app.register(cors, {
    origin: opts.config.allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["content-type", "authorization"],
    maxAge: 86400
  });
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      message: `För många försök. Vänta ${ctx.after} och försök igen.`
    })
  });

  app.addHook("onRequest", async (req) => {
    // Only touches the database when a token is sent, so health checks never
    // wake a suspended Neon compute.
    req.user = await loadUser(app.db, bearerToken(req));
  });

  app.addHook("onSend", async (_req, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("referrer-policy", "no-referrer");
    reply.header("cache-control", "no-store");
    return payload;
  });

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof ZodError) return reply.status(400).send({ error: formatZodError(err) });
    if (err instanceof HttpError) return reply.status(err.statusCode).send({ error: err.message });
    const code = (err as { code?: string }).code;
    if (code === "23505") return reply.status(409).send({ error: "Det finns redan." });
    if (code === "22P02") return reply.status(400).send({ error: "Ogiltigt värde." });
    const status = (err as FastifyError).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: err.message });
    req.log.error(err);
    return reply.status(500).send({ error: "Något gick fel på servern. Försök igen." });
  });

  app.get("/health", async () => ({ ok: true }));
  app.get("/health/db", async () => {
    await app.db.query("SELECT 1");
    return { ok: true };
  });

  for (const routes of [authRoutes, teamRoutes, syncRoutes]) {
    await app.register(routes);
  }
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: "Hittades inte." }));
  return app;
}
