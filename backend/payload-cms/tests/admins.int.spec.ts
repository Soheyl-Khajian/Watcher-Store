import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

// Any user can be deleted except the last administrator: without one,
// nobody could manage the store.
describe('Deleting administrators', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
  });

  afterAll(async () => {
    await t?.close();
  });

  const exists = async (id: number) =>
    (
      await t.payload.find({
        collection: 'users',
        where: { id: { equals: id } },
      })
    ).totalDocs === 1;

  it('refuses to delete the only administrator, even by themselves', async () => {
    const only = await t.createUser('only-admin@example.test', 'admin');

    const response = await t.api('DELETE', `/users/${only.id}`, {
      token: only.token,
    });

    expect(response.status).toBe(409);
    expect(await exists(only.id)).toBe(true);
  });

  it('lets an administrator delete customers', async () => {
    const admin = await t.createUser('manager@example.test', 'admin');
    const customer = await t.createUser('former-customer@example.test');

    const response = await t.api('DELETE', `/users/${customer.id}`, {
      token: admin.token,
    });

    expect(response.status).toBe(200);
    expect(await exists(customer.id)).toBe(false);
  });

  it('allows deleting an administrator while another one remains', async () => {
    const leaving = await t.createUser('leaving-admin@example.test', 'admin');
    const staying = await t.createUser('staying-admin@example.test', 'admin');

    // Administrators may also delete their own account.
    const response = await t.api('DELETE', `/users/${leaving.id}`, {
      token: leaving.token,
    });

    expect(response.status).toBe(200);
    expect(await exists(leaving.id)).toBe(false);
    expect(await exists(staying.id)).toBe(true);
  });

  it('refuses again once only one administrator is left', async () => {
    const { docs: admins } = await t.payload.find({
      collection: 'users',
      where: { role: { equals: 'admin' } },
      limit: 100,
    });
    const [last, ...others] = admins;
    for (const other of others) {
      await t.payload.delete({ collection: 'users', id: other.id });
    }

    const response = await t.api('DELETE', `/users/${last.id}`, {
      token: (await t.createUser('one-more-customer@example.test')).token,
    });
    // A customer is not allowed to delete anyone in the first place.
    expect(response.status).toBe(403);

    await expect(
      t.payload.delete({ collection: 'users', id: last.id }),
    ).rejects.toThrow();
    expect(await exists(last.id)).toBe(true);
  });
});
