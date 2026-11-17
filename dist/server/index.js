import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { seedDrills } from './seed.js';
const config = loadConfig();
const pool = createPool(config.databaseUrl);
await migrate(pool);
const seeded = await seedDrills(pool);
if (seeded)
    console.log(`[seed] lade till ${seeded} övningar i biblioteket`);
await pool.query('DELETE FROM auth_sessions WHERE expires_at < now()');
const app = await buildApp({ pool, config });
await app.listen({ port: config.port, host: config.host });
for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, async () => {
        app.log.info(`${signal} mottagen, stänger ner`);
        await app.close();
        await pool.end();
        process.exit(0);
    });
}
//# sourceMappingURL=index.js.map