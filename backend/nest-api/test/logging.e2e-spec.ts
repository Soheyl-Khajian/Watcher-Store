import { createTestApp, TestApp } from './e2e/harness';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Every response carries a request id, so a customer's error report can be
// matched with the server's log line for that request.
describe('Request ids (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t?.close();
  });

  it('adds a generated id to every response', async () => {
    const response = await t.http().get('/health').expect(200);
    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('keeps a well-formed id sent with the request', async () => {
    const response = await t
      .http()
      .get('/health')
      .set('X-Request-Id', 'storefront-abc123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('storefront-abc123');
  });

  it('replaces an unsafe id', async () => {
    const response = await t
      .http()
      .get('/health')
      .set('X-Request-Id', 'x'.repeat(100))
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(UUID);
  });

  it('includes the id in error responses', async () => {
    const response = await t.http().get('/cart').expect(401);

    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
});
