// backend/nest-api/src/database/ensure-schema.ts
import { Client } from 'pg';
import { env } from '../env';

// A plain connection without the `schema` option, so it works on a bare
// database.
export function createDatabaseClient(): Client {
  return new Client({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });
}

/**
 * Creates the NestJS schema if it is missing.
 *
 * This cannot live in a migration. TypeORM's MigrationExecutor creates its
 * own `migrations` bookkeeping table inside the configured schema *before*
 * it executes any migration, so a CREATE SCHEMA inside a migration is
 * unreachable on a database where the schema does not exist yet.
 *
 * In production the schema already exists: deploy/postgres/roles.sql
 * creates it, owned by the API's own role, which may not create schemas.
 * Postgres refuses even CREATE SCHEMA IF NOT EXISTS to such a role, so the
 * schema is looked up first and created only when it is missing (local
 * development, tests).
 *
 * Uses the given connection, or opens and closes one of its own.
 */
export async function ensureSchema(existing?: Client): Promise<void> {
  const client = existing ?? createDatabaseClient();

  if (!existing) {
    await client.connect();
  }
  try {
    const found = await client.query(
      'SELECT 1 FROM pg_namespace WHERE nspname = $1',
      [env.NEST_SCHEMA],
    );
    if (found.rowCount === 0) {
      // Identifiers cannot be parameterised; NEST_SCHEMA is validated in
      // env.ts.
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${env.NEST_SCHEMA}"`);
    }
  } finally {
    if (!existing) {
      await client.end();
    }
  }
}
