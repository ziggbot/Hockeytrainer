export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  production: boolean;
  /** Web app origins allowed to call the API (CORS), e.g. https://tranarappen-web.onrender.com */
  allowedOrigins: string[];
  /** Max login/register/reset attempts per IP per minute. */
  authRateLimitMax: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL saknas. Sätt den till Neons anslutningssträng (se docs/DEPLOY.md).");
  }
  const production = env.NODE_ENV === "production";
  const origins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return {
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? "0.0.0.0",
    databaseUrl,
    production,
    allowedOrigins: production ? origins : [...origins, "http://localhost:5173", "http://localhost:4173"],
    authRateLimitMax: Number(env.AUTH_RATE_LIMIT_MAX ?? 10)
  };
}
