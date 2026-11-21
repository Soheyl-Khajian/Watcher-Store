import { readdirSync } from 'fs';
import { join } from 'path';
import { createTestApp, TestApp } from './e2e/harness';

const MIGRATION_COUNT = readdirSync(
  join(__dirname, '..', 'src', 'database', 'migrations'),
).filter((file) => file.endsWith('.ts')).length;

// Production runs migrations as a job before the API starts
// (node dist/database/migrate.js) instead of on every boot.
describe('Migrate job (e2e)', () => {
  let t: TestApp;
  let migrate: () => Promise<string[]>;

  const orderTableExists = async (): Promise<boolean> => {
    const { rows } = await t.db.query(
      `SELECT to_regclass('nest_schema."order"') IS NOT NULL AS exists`,
    );
    return rows[0].exists;
  };

  beforeAll(async () => {
    t = await createTestApp({ MIGRATIONS_RUN_ON_BOOT: 'false' });
    // Loaded after the harness has configured the environment.
    ({ migrate } = await import('../src/database/migrate'));
  });

  afterAll(async () => {
    await t?.close();
  });

  it('leaves the database alone when the API starts', async () => {
    expect(await orderTableExists()).toBe(false);
  });

  it('applies every migration, and the API then works', async () => {
    const applied = await migrate();

    expect(applied).toHaveLength(MIGRATION_COUNT);
    expect(await orderTableExists()).toBe(true);

    const user = await t.createUser({ email: 'migrated@example.test' });
    await t
      .http()
      .get('/cart')
      .set('Authorization', `Bearer ${await t.login(user)}`)
      .expect(200);
  });

  it('applies nothing the second time', async () => {
    await expect(migrate()).resolves.toEqual([]);
  });

  it('is safe when two runs start at once', async () => {
    await t.db.query('DROP SCHEMA nest_schema CASCADE');

    const [first, second] = await Promise.all([migrate(), migrate()]);

    // One run applies everything; the other waits, then finds nothing to do.
    expect([first.length, second.length].sort()).toEqual([0, MIGRATION_COUNT]);
    const { rows } = await t.db.query(
      'SELECT count(*)::int AS count FROM nest_schema.migrations',
    );
    expect(rows[0].count).toBe(MIGRATION_COUNT);
  });
});
