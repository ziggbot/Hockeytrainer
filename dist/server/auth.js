import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { unauthorized } from './errors.js';
const scrypt = promisify(scryptCb);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
export const SESSION_COOKIE = 'ht_session';
export const SESSION_DAYS = 30;
export async function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
    return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), hash.toString('base64')].join('$');
}
export async function verifyPassword(password, stored) {
    const [algo, n, r, p, saltB64, hashB64] = stored.split('$');
    if (algo !== 'scrypt' || !saltB64 || !hashB64)
        return false;
    const expected = Buffer.from(hashB64, 'base64');
    const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
        N: Number(n), r: Number(r), p: Number(p),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}
/** Random URL-safe token. Only its SHA-256 is stored in the database. */
export function newToken() {
    return randomBytes(32).toString('base64url');
}
export function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export async function createSession(db, userId) {
    const token = newToken();
    await db.query(`INSERT INTO auth_sessions (id, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`, [hashToken(token), userId, SESSION_DAYS]);
    return token;
}
export function setSessionCookie(reply, token, secure) {
    reply.setCookie(SESSION_COOKIE, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: SESSION_DAYS * 24 * 3600,
    });
}
export function clearSessionCookie(reply, secure) {
    reply.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, sameSite: 'lax', secure });
}
/** Resolves the logged-in user from the session cookie (null if none/expired). */
export async function loadUser(db, token) {
    if (!token)
        return null;
    const { rows } = await db.query(`SELECT u.id, u.email, u.name
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.expires_at > now()`, [hashToken(token)]);
    return rows[0] ?? null;
}
export function requireUser(req) {
    if (!req.user)
        throw unauthorized();
    return req.user;
}
/**
 * Per-account throttle for failed logins. IP-based rate limiting alone is weak behind a proxy
 * (X-Forwarded-For can be forged), so we also cap failures per e-mail address.
 * In-memory is fine for a single Render instance.
 */
export class LoginThrottle {
    maxFailures;
    windowMs;
    failures = new Map();
    constructor(maxFailures = 10, windowMs = 15 * 60_000) {
        this.maxFailures = maxFailures;
        this.windowMs = windowMs;
    }
    isBlocked(email, now = Date.now()) {
        const entry = this.failures.get(email);
        if (!entry)
            return false;
        if (entry.resetAt <= now) {
            this.failures.delete(email);
            return false;
        }
        return entry.count >= this.maxFailures;
    }
    fail(email, now = Date.now()) {
        const entry = this.failures.get(email);
        if (!entry || entry.resetAt <= now) {
            this.failures.set(email, { count: 1, resetAt: now + this.windowMs });
        }
        else {
            entry.count += 1;
        }
        if (this.failures.size > 10_000) {
            for (const [key, e] of this.failures)
                if (e.resetAt <= now)
                    this.failures.delete(key);
        }
    }
    reset(email) {
        this.failures.delete(email);
    }
}
//# sourceMappingURL=auth.js.map