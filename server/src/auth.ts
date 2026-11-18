import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { FastifyRequest } from "fastify";
import type { Queryable } from "./db.js";
import { unauthorized } from "./errors.js";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
/** Coaches rarely log in again on the same phone; keep them signed in for half a year. */
export const TOKEN_DAYS = 180;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p)
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Random URL-safe token. Only its SHA-256 is stored in the database. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issues a bearer token. Only its SHA-256 is stored. */
export async function createToken(db: Queryable, userId: string): Promise<string> {
  const token = newToken();
  await db.query(`INSERT INTO auth_tokens (id, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`, [
    hashToken(token),
    userId,
    TOKEN_DAYS
  ]);
  return token;
}

/** The token from an `Authorization: Bearer …` header, if any. */
export function bearerToken(req: FastifyRequest): string | undefined {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value : undefined;
}

/** Resolves the logged-in user from a bearer token (null if none/expired). */
export async function loadUser(db: Queryable, token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const { rows } = await db.query<AuthUser>(
    `SELECT u.id, u.email, u.name
       FROM auth_tokens s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now()`,
    [hashToken(token)]
  );
  return rows[0] ?? null;
}

export function requireUser(req: FastifyRequest): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}

/**
 * Per-account throttle for failed logins. IP-based rate limiting alone is weak behind a proxy
 * (X-Forwarded-For can be forged), so we also cap failures per e-mail address.
 * In-memory is fine for a single Render instance.
 */
export class LoginThrottle {
  private failures = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private maxFailures = 10,
    private windowMs = 15 * 60_000
  ) {}

  isBlocked(email: string, now = Date.now()): boolean {
    const entry = this.failures.get(email);
    if (!entry) return false;
    if (entry.resetAt <= now) {
      this.failures.delete(email);
      return false;
    }
    return entry.count >= this.maxFailures;
  }

  fail(email: string, now = Date.now()): void {
    const entry = this.failures.get(email);
    if (!entry || entry.resetAt <= now) {
      this.failures.set(email, { count: 1, resetAt: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    if (this.failures.size > 10_000) {
      for (const [key, e] of this.failures) if (e.resetAt <= now) this.failures.delete(key);
    }
  }

  reset(email: string): void {
    this.failures.delete(email);
  }
}
