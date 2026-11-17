import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { seedDrills } from './seed.js';
const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL saknas');
    process.exit(1);
}
const pool = createPool(url);
try {
    await migrate(pool);
    const n = await seedDrills(pool);
    console.log(`[seed] ${n} nya övningar`);
}
finally {
    await pool.end();
}
//# sourceMappingURL=migrate-cli.js.map