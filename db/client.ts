import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Singleton connection pool. In a Fluid Compute / serverless world each
// function instance gets its own Node process; we keep one pool per
// process so repeated requests reuse connections. Drizzle's node-postgres
// driver lives on top of pg.

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in, or run `docker compose up -d` for the local Postgres.',
    );
  }
  pool = new Pool({
    connectionString,
    // Conservative defaults for serverless. Neon's pooler handles the heavy
    // lifting; per-instance pools stay small.
    max: 5,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export const db = drizzle({
  client: getPool(),
  schema,
});

export type Database = typeof db;
export { schema };
