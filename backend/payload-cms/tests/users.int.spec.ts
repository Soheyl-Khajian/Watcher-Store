import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestPayload,
  TEST_PASSWORD,
  type TestPayload,
} from './helpers/test-payload';

describe('Users', () => {
  let t: TestPayload;

  beforeAll(async () => {
    t = await createTestPayload();
  });

  afterAll(async () => {
    await t?.close();
  });

  it('lets anyone register as a customer', async () => {
    const response = await t.api('POST', '/users', {
      body: {
        email: 'new-customer@example.test',
        password: TEST_PASSWORD,
        displayName: 'New Customer',
      },
    });

    expect(response.status).toBe(201);

    const stored = await t.payload.findByID({
      collection: 'users',
      id: (response.body.doc as { id: number }).id,
    });
    expect(stored.role).toBe('customer');
  });

  it('ignores a role chosen at registration', async () => {
    const response = await t.api('POST', '/users', {
      body: {
        email: 'wannabe-admin@example.test',
        password: TEST_PASSWORD,
        displayName: 'Wannabe',
        role: 'admin',
      },
    });

    expect(response.status).toBe(201);

    const stored = await t.payload.findByID({
      collection: 'users',
      id: (response.body.doc as { id: number }).id,
    });
    expect(stored.role).toBe('customer');
  });

  it('does not let customers promote themselves', async () => {
    const customer = await t.createUser('self-promote@example.test');

    await t.api('PATCH', `/users/${customer.id}`, {
      token: customer.token,
      body: { role: 'admin' },
    });

    const stored = await t.payload.findByID({
      collection: 'users',
      id: customer.id,
    });
    expect(stored.role).toBe('customer');
  });

  it('hides the role field from customers', async () => {
    const customer = await t.createUser('role-hidden@example.test');

    const me = await t.api('GET', '/users/me', { token: customer.token });

    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: customer.id });
    expect(me.body.user).not.toHaveProperty('role');
  });

  it('shows the role to administrators', async () => {
    const admin = await t.createUser('role-visible@example.test', 'admin');

    const me = await t.api('GET', '/users/me', { token: admin.token });

    expect(me.body.user).toMatchObject({ id: admin.id, role: 'admin' });
  });

  it('lets customers read only their own account', async () => {
    const alice = await t.createUser('alice@example.test');
    const bob = await t.createUser('bob@example.test');

    const own = await t.api('GET', `/users/${alice.id}`, {
      token: alice.token,
    });
    expect(own.status).toBe(200);

    const other = await t.api('GET', `/users/${bob.id}`, {
      token: alice.token,
    });
    expect(other.status).not.toBe(200);

    const list = await t.api('GET', '/users', { token: alice.token });
    expect(list.body.docs).toEqual([expect.objectContaining({ id: alice.id })]);
  });

  it('does not list users to anonymous visitors', async () => {
    const response = await t.api('GET', '/users');
    expect(response.status).toBe(403);
  });

  it('only lets administrators delete users', async () => {
    const customer = await t.createUser('delete-me@example.test');
    const admin = await t.createUser('deleter@example.test', 'admin');

    const denied = await t.api('DELETE', `/users/${customer.id}`, {
      token: customer.token,
    });
    expect(denied.status).toBe(403);

    const allowed = await t.api('DELETE', `/users/${customer.id}`, {
      token: admin.token,
    });
    expect(allowed.status).toBe(200);
  });
});
