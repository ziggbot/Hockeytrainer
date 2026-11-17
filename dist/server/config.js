function bool(value, fallback) {
    if (value === undefined || value === '')
        return fallback;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
export function loadConfig(env = process.env) {
    const databaseUrl = env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error('DATABASE_URL saknas. Sätt den till Neons connection string (se docs/DEPLOY.md).');
    }
    const production = env.NODE_ENV === 'production';
    return {
        port: Number(env.PORT ?? 3000),
        host: env.HOST ?? '0.0.0.0',
        databaseUrl,
        production,
        allowClubSignup: bool(env.ALLOW_CLUB_SIGNUP, true),
        cookieSecure: bool(env.COOKIE_SECURE, production),
        webDistDir: env.WEB_DIST_DIR ?? 'dist/web',
        authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX ?? 10),
    };
}
//# sourceMappingURL=config.js.map