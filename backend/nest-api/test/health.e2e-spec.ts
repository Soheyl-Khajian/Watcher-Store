import { createTestApp, TestApp } from './e2e/harness';

// /health answers "the process is alive" (restart it if not).
// /health/ready answers "it can serve requests" (send it traffic or not):
// the database and Payload must both be reachable.
describe('Health checks (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    // A low general limit, so the rate limiting test means something.
    t = await createTestApp({
      PAYLOAD_TIMEOUT_MS: '500',
      RATE_LIMIT_PER_MINUTE: '3',
    });
  });

  afterEach(() => {
    t.payload.mode = 'normal';
  });

  afterAll(async () => {
    await t?.close();
  });

  it('reports liveness', async () => {
    const response = await t.http().get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports ready when the database and Payload are reachable', async () => {
    const response = await t.http().get('/health/ready').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      checks: { database: 'up', payload: 'up' },
    });
  });

  it.each(['error', 'hang-up', 'slow'] as const)(
    'reports not ready when Payload is %s',
    async (mode) => {
      t.payload.mode = mode;
      const response = await t.http().get('/health/ready').expect(503);

      expect(response.body).toEqual({
        status: 'unavailable',
        checks: { database: 'up', payload: 'down' },
      });
    },
  );

  it('stays alive while Payload is down', async () => {
    t.payload.mode = 'hang-up';
    await t.http().get('/health').expect(200);
  });

  it('is never rate limited', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => t.http().get('/health/ready')),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
  });
});
