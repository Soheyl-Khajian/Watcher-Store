import { JwtService } from '@nestjs/jwt';
import type { FixtureUser } from './e2e/payload-fixture';
import { createTestApp, TestApp } from './e2e/harness';

// A token is accepted only if it was issued by this API, for the storefront,
// with HS256. A valid signature alone is not enough.
describe('Login tokens (e2e)', () => {
  let t: TestApp;
  let user: FixtureUser;
  let jwt: JwtService;

  beforeAll(async () => {
    t = await createTestApp();
    user = await t.createUser({ email: 'tokens@example.test' });
    jwt = new JwtService({ secret: t.jwtSecret });
  });

  afterAll(async () => {
    await t?.close();
  });

  const profile = (token: string) =>
    t.http().get('/auth/profile').set('Authorization', `Bearer ${token}`);

  const claims = () => ({ sub: user.id, email: user.email, role: 'customer' });

  it('issues tokens that name this API and the storefront', async () => {
    const token = await t.login(user);
    const decoded = jwt.decode(token, { complete: true }) as {
      header: { alg: string };
      payload: { iss: string; aud: string; exp: number; iat: number };
    };

    expect(decoded.header.alg).toBe('HS256');
    expect(decoded.payload.iss).toBe('watcher-store-api');
    expect(decoded.payload.aud).toBe('watcher-store-storefront');
    expect(decoded.payload.exp - decoded.payload.iat).toBe(60 * 60);

    await profile(token).expect(200);
  });

  it('rejects a token without issuer and audience, even with the right secret', async () => {
    const token = jwt.sign(claims(), { algorithm: 'HS256', expiresIn: '5m' });
    await profile(token).expect(401);
  });

  it.each([
    [
      'another issuer',
      { issuer: 'someone-else', audience: 'watcher-store-storefront' },
    ],
    [
      'another audience',
      { issuer: 'watcher-store-api', audience: 'payload-admin' },
    ],
  ])('rejects a token for %s', async (_label, options) => {
    const token = jwt.sign(claims(), {
      algorithm: 'HS256',
      expiresIn: '5m',
      ...options,
    });
    await profile(token).expect(401);
  });

  it('rejects a token signed with another HMAC algorithm', async () => {
    const token = jwt.sign(claims(), {
      algorithm: 'HS512',
      expiresIn: '5m',
      issuer: 'watcher-store-api',
      audience: 'watcher-store-storefront',
    });
    await profile(token).expect(401);
  });

  it('rejects an unsigned token (alg "none")', async () => {
    const encode = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
      ...claims(),
      iss: 'watcher-store-api',
      aud: 'watcher-store-storefront',
      exp: Math.floor(Date.now() / 1000) + 300,
    })}.`;

    await profile(token).expect(401);
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign(
      {
        ...claims(),
        iat: Math.floor(Date.now() / 1000) - 3600,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      {
        algorithm: 'HS256',
        issuer: 'watcher-store-api',
        audience: 'watcher-store-storefront',
      },
    );
    await profile(token).expect(401);
  });
});
