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
});
