import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ice_cream_app',
  max: 10,
  idleTimeoutMillis: 30000
});

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const results = await pool.query(text, params as any);
  return results.rows as T[];
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const results = await pool.query(text, params as any);
  return results.rows[0] as T | null;
}

export async function execute(text: string, params?: unknown[]): Promise<{ rows: number }> {
  const result = await pool.query(text, params as any);
  return { rows: result.rowCount || 0 };
}

export async function closeConnections(): Promise<void> {
  await pool.end();
}
