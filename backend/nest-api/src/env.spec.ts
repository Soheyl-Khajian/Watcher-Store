import { parseEnv } from './env';

const validEnv: NodeJS.ProcessEnv = {
  JWT_SECRET: 'x'.repeat(32),
  PAYLOAD_INTERNAL_URL: 'http://payload-cms:3000/api',
  FRONTEND_URL: 'http://localhost:3002',
};

describe('parseEnv', () => {
  it('accepts a minimal configuration and applies defaults', () => {
    const env = parseEnv(validEnv);

    expect(env.PORT).toBe(3001);
    expect(env.NEST_SCHEMA).toBe('nest_schema');
    expect(env.PENDING_ORDER_TTL_HOURS).toBe(24);
    expect(env.ALLOW_MOCK_PAYMENT).toBe(false);
  });

  describe('simulated payment', () => {
    it('is refused when NODE_ENV=production', () => {
      expect(() =>
        parseEnv({
          ...validEnv,
          NODE_ENV: 'production',
          ALLOW_MOCK_PAYMENT: 'true',
        }),
      ).toThrow(/ALLOW_MOCK_PAYMENT/);
    });

    it('can be enabled outside production', () => {
      const env = parseEnv({
        ...validEnv,
        NODE_ENV: 'development',
        ALLOW_MOCK_PAYMENT: 'true',
      });

      expect(env.ALLOW_MOCK_PAYMENT).toBe(true);
    });

    it('rejects values other than "true" and "false"', () => {
      expect(() =>
        parseEnv({ ...validEnv, ALLOW_MOCK_PAYMENT: 'yes' }),
      ).toThrow();
    });
  });

  it('requires a JWT secret of at least 32 characters', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrow();
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: undefined })).toThrow();
  });

  // Schema names are interpolated into SQL, so anything that is not a bare
  // identifier must be rejected.
  it.each(['public"; DROP TABLE x; --', 'Nest', '1schema', 'a-b', ''])(
    'rejects the schema name %p',
    (schema) => {
      expect(() => parseEnv({ ...validEnv, NEST_SCHEMA: schema })).toThrow();
      expect(() => parseEnv({ ...validEnv, PAYLOAD_SCHEMA: schema })).toThrow();
    },
  );

  it.each(['0', '721', '1.5', 'abc'])(
    'rejects PENDING_ORDER_TTL_HOURS=%p',
    (hours) => {
      expect(() =>
        parseEnv({ ...validEnv, PENDING_ORDER_TTL_HOURS: hours }),
      ).toThrow();
    },
  );

  it('requires valid service URLs', () => {
    expect(() =>
      parseEnv({ ...validEnv, PAYLOAD_INTERNAL_URL: 'not a url' }),
    ).toThrow();
    expect(() => parseEnv({ ...validEnv, FRONTEND_URL: undefined })).toThrow();
  });

  it('defaults the token lifetime to 60 minutes and validates it', () => {
    expect(parseEnv(validEnv).JWT_EXPIRES_IN).toBe('60m');
    expect(
      parseEnv({ ...validEnv, JWT_EXPIRES_IN: '12h' }).JWT_EXPIRES_IN,
    ).toBe('12h');
    for (const JWT_EXPIRES_IN of ['forever', '60', '-5m', '1.5h']) {
      expect(() => parseEnv({ ...validEnv, JWT_EXPIRES_IN })).toThrow(
        /JWT_EXPIRES_IN/,
      );
    }
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => parseEnv({ ...validEnv, NODE_ENV: 'prod' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('uses the local default database password outside production', () => {
    expect(parseEnv(validEnv).POSTGRES_PASSWORD).toBe('postgres');
  });

  describe('in production', () => {
    const production: NodeJS.ProcessEnv = {
      ...validEnv,
      NODE_ENV: 'production',
      JWT_SECRET: 'a3f1c9e07b2d4e8f9a6c5b1d0e7f2a4c8b9d6e3f1a0c7b5d',
      POSTGRES_PASSWORD: 'Str0ng-Db-Passw0rd',
    };

    it('accepts a complete configuration', () => {
      expect(() => parseEnv(production)).not.toThrow();
    });

    it.each([
      'replace-with-64-char-hex-secret-from-openssl-rand-hex-32',
      'CHANGE_ME-CHANGE_ME-CHANGE_ME-CHANGE_ME',
    ])('rejects the placeholder JWT secret %p', (JWT_SECRET) => {
      expect(() => parseEnv({ ...production, JWT_SECRET })).toThrow(
        /JWT_SECRET/,
      );
    });

    it('requires an explicit database password', () => {
      expect(() =>
        parseEnv({ ...production, POSTGRES_PASSWORD: undefined }),
      ).toThrow(/POSTGRES_PASSWORD/);
    });

    it.each(['postgres', 'password', 'changeme', ''])(
      'rejects the weak database password %p',
      (POSTGRES_PASSWORD) => {
        expect(() => parseEnv({ ...production, POSTGRES_PASSWORD })).toThrow(
          /POSTGRES_PASSWORD/,
        );
      },
    );
  });
});
