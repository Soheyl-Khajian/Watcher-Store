// backend/nest-api/src/database/ensure-schema.ts
import { Client } from 'pg';
import { env } from '../env';

/**
 * Creates the NestJS schema if it is missing.
 *
 * This cannot live in a migration. TypeORM's MigrationExecutor creates its
 * own `migrations` bookkeeping table inside the configured schema *before*
 * it executes any migration, so a CREATE SCHEMA inside a migration is
 * unreachable on a database where the schema does not exist yet.
 *
 * Connects without the `schema` option so it works on a bare database.
 */
export async function ensureSchema(): Promise<void> {
  const client = new Client({
    host: env.DATABASE_HOST,
    port: env.DATABASE_PORT,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
  });

  await client.connect();
  try {
    // Identifiers cannot be parameterised; NEST_SCHEMA is validated in env.ts.
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${env.NEST_SCHEMA}"`);
  } finally {
    await client.end();
  }
}