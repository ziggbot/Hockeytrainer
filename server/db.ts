import pg from 'pg';

// Keep DATE columns as 'YYYY-MM-DD' strings instead of JS Dates (avoids timezone off-by-one).
pg.types.setTypeParser(1082, (v: string) => v);

export type Pool = pg.Pool;
export type Client = pg.PoolClient;
export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 5),
    // Neon suspends idle compute; let idle connections go so the pool reconnects cleanly.
    idleTimeoutMillis: 30_000,
    // A suspended Neon compute needs a moment to wake up.
    connectionTimeoutMillis: 20_000,
  });
  // Without this handler an idle connection dropped by Neon would crash the process.
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

export async function tx<T>(pool: pg.Pool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
