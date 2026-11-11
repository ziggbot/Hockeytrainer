import { existsSync } from 'node:fs';
import path from 'node:path';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { loadUser, SESSION_COOKIE } from './auth.js';
import type { Config } from './config.js';
import type { Pool } from './db.js';
import { HttpError } from './errors.js';
import authRoutes from './routes/auth.js';
import clubRoutes from './routes/clubs.js';
import drillRoutes from './routes/drills.js';
import practiceRoutes from './routes/practices.js';
import teamRoutes from './routes/teams.js';
import { formatZodError } from './validation.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool;
    config: Config;
  }
}

export async function buildApp(opts: { pool: Pool; config: Config; logger?: boolean }) {
  const app = Fastify({
    logger: opts.logger ?? true,
    // Render terminates TLS in front of the service. Client IPs from X-Forwarded-For are
    // best effort only (forgeable), so logins are additionally throttled per account.
    trustProxy: true,
    bodyLimit: 256 * 1024,
  });
  app.decorate('db', opts.pool);
  app.decorate('config', opts.config);
  app.decorateRequest('user', null);

  await app.register(cookie);
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      message: `För många försök. Vänta ${ctx.after} och försök igen.`,
    }),
  });

  app.addHook('onRequest', async (req) => {
    if (!req.url.startsWith('/api/')) return;
    // CSRF defence in depth on top of SameSite=Lax cookies: writes must come from our own origin.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (origin) {
        let host: string | null = null;
        try {
          host = new URL(origin).host;
        } catch {
          host = null;
        }
        if (host !== req.headers.host) throw new HttpError(403, 'Ogiltigt ursprung.');
      }
    }
    // Only touches the database when a session cookie is present, so health checks
    // never wake a suspended Neon compute.
    req.user = await loadUser(app.db, req.cookies[SESSION_COOKIE]);
  });

  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    // Invite, reset and share tokens live in URLs; never leak them via Referer.
    reply.header('referrer-policy', 'no-referrer');
    reply.header('x-frame-options', 'DENY');
    reply.header(
      'content-security-policy',
      "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
    if (req.url.startsWith('/api/') && !reply.hasHeader('cache-control')) reply.header('cache-control', 'no-store');
    return payload;
  });

  app.setErrorHandler((err: FastifyError | Error, req, reply) => {
    if (err instanceof ZodError) return reply.status(400).send({ error: formatZodError(err) });
    if (err instanceof HttpError) return reply.status(err.statusCode).send({ error: err.message });
    const code = (err as { code?: string }).code;
    if (code === '23505') return reply.status(409).send({ error: 'Det finns redan.' });
    if (code === '22P02') return reply.status(400).send({ error: 'Ogiltigt värde.' });
    const status = (err as FastifyError).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: err.message });
    req.log.error(err);
    return reply.status(500).send({ error: 'Något gick fel på servern. Försök igen.' });
  });

  // Liveness only: deliberately no DB query (Render polls this often; Neon would never sleep).
  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/health/db', async () => {
    await app.db.query('SELECT 1');
    return { ok: true };
  });

  for (const routes of [authRoutes, clubRoutes, teamRoutes, practiceRoutes, drillRoutes]) {
    await app.register(routes, { prefix: '/api' });
  }

  const webRoot = path.resolve(opts.config.webDistDir);
  const hasWeb = existsSync(path.join(webRoot, 'index.html'));
  if (hasWeb) {
    await app.register(fastifyStatic, {
      root: webRoot,
      cacheControl: false,
      setHeaders: (reply, filePath) => {
        const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
        reply.header('cache-control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
  }

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.method !== 'GET' || !hasWeb) {
      return reply.status(404).send({ error: 'Hittades inte.' });
    }
    // Client-side routes (/teams/..., /s/<token>, ...) are served by the SPA.
    reply.header('cache-control', 'no-cache');
    return reply.sendFile('index.html');
  });

  return app;
}
