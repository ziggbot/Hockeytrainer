import { tx } from './db.js';
import { migrations } from './migrations.js';
/** Applies pending migrations. Each migration runs in its own transaction. */
export async function migrate(pool, log = console.log) {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await pool.query('SELECT id FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.id));
    const ran = [];
    for (const m of migrations) {
        if (applied.has(m.id))
            continue;
        await tx(pool, async (c) => {
            // Guards against two instances migrating at once (second one fails on the PK and rolls back).
            await c.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
            await c.query(m.sql);
        });
        log(`[migrate] applied ${m.id}`);
        ran.push(m.id);
    }
    return ran;
}
//# sourceMappingURL=migrate.js.map