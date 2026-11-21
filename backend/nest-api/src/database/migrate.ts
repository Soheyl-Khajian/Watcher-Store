// backend/nest-api/src/database/migrate.ts
//
// Applies pending migrations, then exits. In production this runs once per
// deploy, before any API instance starts (the nest-migrate job in
// docker-compose.prod.yml):
//   node dist/database/migrate.js
// so instances never race each other to migrate, and a failed migration
// stops the deploy instead of crash-looping every instance.
//
// A Postgres advisory lock makes concurrent runs safe: a second run waits
// for the first, then finds nothing left to apply.

import 'reflect-metadata';
import pino from 'pino';
import { DataSource } from 'typeorm';
import { env } from '../env';
import { createDatabaseClient, ensureSchema } from './ensure-schema';
import { typeOrmOptions } from './typeorm.options';

const LOCK_KEY = 'watcher-store:nest-migrations';

// Returns the names of the migrations it applied.
export async function migrate(): Promise<string[]> {
  const lock = createDatabaseClient();
  await lock.connect();

  try {
    // Held by this connection until unlocked or the connection closes, so a
    // crashed run never leaves it behind.
    await lock.query('SELECT pg_advisory_lock(hashtext($1))', [LOCK_KEY]);
    await ensureSchema(lock);

    const dataSource = new DataSource({
      ...typeOrmOptions,
      migrationsRun: false,
    });
    await dataSource.initialize();
    try {
      const applied = await dataSource.runMigrations();
      return applied.map((migration) => migration.name);
    } finally {
      await dataSource.destroy();
    }
  } finally {
    await lock.end();
  }
}

if (require.main === module) {
  const logger = pino({ level: env.LOG_LEVEL, base: { job: 'migrate' } });

  migrate()
    .then((applied) => {
      logger.info(
        { applied },
        applied.length > 0
          ? `Applied ${applied.length} migration(s)`
          : 'No pending migrations',
      );
      process.exit(0);
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'Migration failed');
      process.exit(1);
    });
}
