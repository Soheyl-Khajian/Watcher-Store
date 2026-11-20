import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureAdmin } from '../src/utils/ensureAdmin';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

describe('First administrator', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
  });

  afterAll(async () => {
    await t?.close();
  });

  // Every test starts from an empty users table, like a fresh deployment.
  beforeEach(async () => {
    await t.payload.delete({ collection: 'users', where: {} });
  });

  const roleOf = async (email: string) => {
    const { docs } = await t.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
    });
    return docs[0]?.role;
  };

  describe('admin panel first-user screen', () => {
    it('makes the first account an administrator', async () => {
      const response = await t.api('POST', '/users/first-register', {
        body: {
          email: 'owner@example.test',
          password: 'owner-password',
          displayName: 'Owner',
        },
      });

      expect(response.status).toBe(200);
      expect(await roleOf('owner@example.test')).toBe('admin');
    });

    // Choosing "customer" here would leave nobody able to open the panel.
    it('ignores a customer role chosen for the first account', async () => {
      await t.api('POST', '/users/first-register', {
        body: {
          email: 'owner@example.test',
          password: 'owner-password',
          displayName: 'Owner',
          role: 'customer',
        },
      });

      expect(await roleOf('owner@example.test')).toBe('admin');
    });

    it('is closed once any account exists', async () => {
      await t.createUser('existing@example.test');

      const response = await t.api('POST', '/users/first-register', {
        body: {
          email: 'intruder@example.test',
          password: 'intruder-password',
          displayName: 'Intruder',
          role: 'admin',
        },
      });

      expect(response.status).toBe(403);
      expect(await roleOf('intruder@example.test')).toBeUndefined();
    });
  });

  // On a fresh deployment the first shopper to sign up must not become an
  // administrator.
  it('keeps a storefront sign-up a customer even on an empty database', async () => {
    const response = await t.api('POST', '/users', {
      body: {
        email: 'first-shopper@example.test',
        password: 'shopper-password',
        displayName: 'Shopper',
      },
    });

    expect(response.status).toBe(201);
    expect(await roleOf('first-shopper@example.test')).toBe('customer');
  });

  describe('ensureAdmin (pnpm seed:admin)', () => {
    const admin = {
      email: 'seed-admin@example.test',
      password: 'seed-admin-password',
    };

    it('creates the administrator when it does not exist', async () => {
      const result = await ensureAdmin(t.payload, admin);

      expect(result).toBe('created');
      expect(await roleOf(admin.email)).toBe('admin');
    });

    it('does nothing when the administrator already exists', async () => {
      await ensureAdmin(t.payload, admin);

      const second = await ensureAdmin(t.payload, {
        ...admin,
        password: 'a-different-password',
      });

      expect(second).toBe('exists');
      // The original password still works: the existing account is untouched.
      const login = await t.api('POST', '/users/login', { body: admin });
      expect(login.status).toBe(200);
    });

    it('refuses to promote an existing customer account', async () => {
      await t.createUser(admin.email);

      await expect(ensureAdmin(t.payload, admin)).rejects.toThrow(/customer/i);
      expect(await roleOf(admin.email)).toBe('customer');
    });

    it('rejects a password shorter than 8 characters', async () => {
      await expect(
        ensureAdmin(t.payload, { ...admin, password: 'short' }),
      ).rejects.toThrow();
      expect(await roleOf(admin.email)).toBeUndefined();
    });
  });
});
