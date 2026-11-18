import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db.js";
import { migrate } from "./migrate.js";

const config = loadConfig();
const pool = createPool(config.databaseUrl);

await migrate(pool);
await pool.query("DELETE FROM auth_tokens WHERE expires_at < now()");

const app = await buildApp({ pool, config });
await app.listen({ port: config.port, host: config.host });

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    app.log.info(`${signal}: stänger ner`);
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
