import { createTestApp, TestApp } from './e2e/harness';

describe('Auth (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t?.close();
  });

  it('reports health', async () => {
    await t.http().get('/health').expect(200, { status: 'ok' });
  });

  it('logs in through Payload and issues a Nest token', async () => {
    const user = await t.createUser({ email: 'login@example.test' });

    const response = await t
      .http()
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    expect(typeof response.body.access_token).toBe('string');

    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${response.body.access_token}`)
      .expect(200, {
        userId: user.id,
        email: user.email,
        role: 'customer',
      });
  });

  it('rejects a wrong password', async () => {
    const user = await t.createUser({ email: 'wrong@example.test' });

    await t
      .http()
      .post('/auth/login')
      .send({ email: user.email, password: 'not-the-password' })
      .expect(401);
  });

  it('rejects unknown fields in the login body', async () => {
    await t
      .http()
      .post('/auth/login')
      .send({
        email: 'a@example.test',
        password: 'correct-horse-battery',
        role: 'admin',
      })
      .expect(400);
  });

  it('requires a valid token for the profile', async () => {
    await t.http().get('/auth/profile').expect(401);
    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', 'Bearer not.a.token')
      .expect(401);
  });

  it('rejects a token that was signed with another secret', async () => {
    const user = await t.createUser({ email: 'tamper@example.test' });
    const token = await t.login(user);
    const [header, payload] = token.split('.');

    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${header}.${payload}.forged-signature`)
      .expect(401);
  });

  it('resolves the role from Payload on every request', async () => {
    const user = await t.createUser({
      email: 'demoted@example.test',
      role: 'admin',
    });
    const token = await t.login(user);

    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(res.body.role).toBe('admin'));

    await t.db.query(
      `UPDATE payload_schema.users SET role = 'customer' WHERE id = $1`,
      [user.id],
    );

    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => expect(res.body.role).toBe('customer'));
  });

  it('rejects the token of a deleted user immediately', async () => {
    const user = await t.createUser({ email: 'deleted@example.test' });
    const token = await t.login(user);

    await t.db.query(`DELETE FROM payload_schema.users WHERE id = $1`, [
      user.id,
    ]);

    await t
      .http()
      .get('/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});
