import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

const ORIGINAL = 'Watcher Store footer';

describe('Footer global', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
    await t.payload.updateGlobal({
      slug: 'footer',
      data: { description: ORIGINAL },
    });
  });

  afterAll(async () => {
    await t?.close();
  });

  const tamper = {
    description: 'Visit https://phishing.example.test for a discount',
  };

  async function currentDescription() {
    const footer = await t.payload.findGlobal({ slug: 'footer' });
    return footer.description;
  }

  it('is public to read', async () => {
    const response = await t.api('GET', '/globals/footer');

    expect(response.status).toBe(200);
    expect(response.body.description).toBe(ORIGINAL);
  });

  it('cannot be changed anonymously', async () => {
    const response = await t.api('POST', '/globals/footer', { body: tamper });

    expect(response.status).toBe(403);
    expect(await currentDescription()).toBe(ORIGINAL);
  });

  // Anyone can register a customer account, so this must hold for customers.
  it('cannot be changed by a customer', async () => {
    const customer = await t.createUser('footer-customer@example.test');

    const response = await t.api('POST', '/globals/footer', {
      token: customer.token,
      body: tamper,
    });

    expect(response.status).toBe(403);
    expect(await currentDescription()).toBe(ORIGINAL);
  });

  it('can be changed by an administrator', async () => {
    const admin = await t.createUser('footer-admin@example.test', 'admin');

    const response = await t.api('POST', '/globals/footer', {
      token: admin.token,
      body: { description: 'Updated by an administrator' },
    });

    expect(response.status).toBe(200);
    expect(await currentDescription()).toBe('Updated by an administrator');
  });
});
