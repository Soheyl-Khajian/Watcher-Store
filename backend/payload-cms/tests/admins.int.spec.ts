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

// Changing a role must not lock everyone out of the admin panel either.
describe('Changing administrators’ roles', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
  });

  afterAll(async () => {
    await t?.close();
  });

  const roleOf = async (id: number) =>
    (await t.payload.findByID({ collection: 'users', id, depth: 0 })).role;

  it('refuses to make the only administrator a customer', async () => {
    const only = await t.createUser('sole-admin@example.test', 'admin');
    // Another administrator's session would be needed to try it through
    // the panel; the local API (no access rules) shows the guard itself.
    await expect(
      t.payload.update({
        collection: 'users',
        id: only.id,
        data: { role: 'customer' },
      }),
    ).rejects.toThrow(/آخرین مدیر/);
    expect(await roleOf(only.id)).toBe('admin');
  });

  it('ignores an administrator changing their own role', async () => {
    const self = await t.createUser('self-demoting@example.test', 'admin');

    const response = await t.api('PATCH', `/users/${self.id}`, {
      token: self.token,
      body: { role: 'customer' },
    });

    // The field is read-only for one's own account: the rest of the
    // update goes through, the role does not change.
    expect(response.status).toBe(200);
    expect(await roleOf(self.id)).toBe('admin');
  });

  it('lets an administrator demote another while one remains', async () => {
    const manager = await t.createUser('head-admin@example.test', 'admin');
    const other = await t.createUser('second-admin@example.test', 'admin');

    const response = await t.api('PATCH', `/users/${other.id}`, {
      token: manager.token,
      body: { role: 'customer' },
    });

    expect(response.status).toBe(200);
    expect(await roleOf(other.id)).toBe('customer');
    expect(await roleOf(manager.id)).toBe('admin');
  });

  it('lets an administrator promote a customer', async () => {
    const manager = await t.createUser('promoting-admin@example.test', 'admin');
    const customer = await t.createUser('promoted@example.test');

    const response = await t.api('PATCH', `/users/${customer.id}`, {
      token: manager.token,
      body: { role: 'admin' },
    });

    expect(response.status).toBe(200);
    expect(await roleOf(customer.id)).toBe('admin');
  });
});
