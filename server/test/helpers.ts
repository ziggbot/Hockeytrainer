import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createPool, type Pool } from '../db.js';
import { migrate } from '../migrate.js';
import { seedDrills } from '../seed.js';

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/hockeytrainer_test';

export async function setup(): Promise<{ app: FastifyInstance; pool: Pool }> {
  const pool = createPool(TEST_DB_URL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool, () => undefined);
  await seedDrills(pool);
  const config = { ...loadConfig({ DATABASE_URL: TEST_DB_URL }), webDistDir: '/nonexistent', authRateLimitMax: 10_000 };
  const app = await buildApp({ pool, config, logger: false });
  await app.ready();
  return { app, pool };
}

/** Minimal cookie-keeping client around app.inject. */
export class Client {
  cookie = '';
  constructor(private app: FastifyInstance) {}

  async req(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await this.app.inject({
      method,
      url,
      payload: body === undefined ? undefined : (body as object),
      headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...headers },
    });
    const setCookie = res.headers['set-cookie'];
    const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (first) {
      const pair = first.split(';')[0]!;
      this.cookie = pair.endsWith('=') ? '' : pair;
    }
    let json: any = null;
    try {
      json = res.json();
    } catch {
      json = null;
    }
    return { status: res.statusCode, json, headers: res.headers };
  }

  get = (url: string) => this.req('GET', url);
  post = (url: string, body?: unknown) => this.req('POST', url, body ?? {});
  patch = (url: string, body: unknown) => this.req('PATCH', url, body);
  put = (url: string, body: unknown) => this.req('PUT', url, body);
  del = (url: string) => this.req('DELETE', url);
}

let counter = 0;
export function uniqueEmail(prefix: string) {
  counter += 1;
  return `${prefix}${counter}@example.test`;
}
