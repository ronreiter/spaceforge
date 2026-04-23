import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Singleton connection pool. In a Fluid Compute / serverless world each
// function instance gets its own Node process; we keep one pool per
// process so repeated requests reuse connections. Drizzle's node-postgres
// driver lives on top of pg.
//
// Lazy init: Next.js's `collect page data` build step imports every
// route module. If we connected eagerly we'd blow up the build for
// anyone without DATABASE_URL at build time (CI, preview builds
// before env is wired, etc). Wrapping the `db` export in a Proxy
// delays pool creation until the first query — runtime only, when
// the env var is actually present.

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

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

function getDb(): NodePgDatabase<typeof schema> {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle({ client: getPool(), schema });
  return dbInstance;
}

// Forward property access to the real Drizzle instance. First touch
// triggers pool creation and connects. Build-time imports that never
// actually query never connect.
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export type Database = typeof db;
export { schema };
