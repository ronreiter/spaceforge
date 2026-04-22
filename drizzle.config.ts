import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://spaceforge:spaceforge@localhost:5432/spaceforge',
  },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
