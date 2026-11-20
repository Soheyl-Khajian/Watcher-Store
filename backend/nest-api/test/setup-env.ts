// backend/nest-api/test/setup-env.ts
//
// src/env.ts validates process.env as soon as it is imported. Unit tests
// import modules that depend on it, so give it a complete, harmless
// configuration first. Values already set (for example by the e2e harness)
// win.

const testDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'unit-test-jwt-secret-0000000000000000000000000000',
  PAYLOAD_INTERNAL_URL: 'http://127.0.0.1:9/api',
  FRONTEND_URL: 'http://localhost:3002',
  ALLOW_MOCK_PAYMENT: 'false',
};

for (const [key, value] of Object.entries(testDefaults)) {
  process.env[key] ??= value;
}
