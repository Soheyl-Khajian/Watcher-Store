// Smoke-checks a running production stack (docker-compose.prod.yml).
//
// Waits until every service answers, then checks that each one serves real
// pages and API responses, and that the services work together: a customer
// registered in Payload can log in through Nest.
//
// Usage: node scripts/smoke-check.mjs
// Env:   PAYLOAD_URL (default http://localhost:3000)
//        NEST_URL (default http://localhost:3001)
//        FRONTEND_URL (default http://localhost:3002)
//        SMOKE_TIMEOUT_SECONDS (default 300)

import { randomBytes } from 'node:crypto';

const PAYLOAD = process.env.PAYLOAD_URL ?? 'http://localhost:3000';
const NEST = process.env.NEST_URL ?? 'http://localhost:3001';
const FRONTEND = process.env.FRONTEND_URL ?? 'http://localhost:3002';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_SECONDS ?? 300) * 1000;

const failures = [];

async function request(url, init = {}) {
  const response = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
    ...init,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, text, json };
}

async function waitFor(name, url) {
  const deadline = Date.now() + TIMEOUT_MS;
  let last = 'no response';

  while (Date.now() < deadline) {
    try {
      const { status } = await request(url);
      if (status >= 200 && status < 400) {
        console.log(`ready  ${name}`);
        return;
      }
      last = `HTTP ${status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`${name} did not become ready at ${url} (${last})`);
}

async function check(name, run) {
  try {
    await run();
    console.log(`pass   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(
      `FAIL   ${name}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function expectStatus(result, expected) {
  if (result.status !== expected) {
    throw new Error(
      `expected HTTP ${expected}, got ${result.status}: ${result.text.slice(0, 200)}`,
    );
  }
}

await waitFor('nest-api', `${NEST}/health`);
await waitFor('payload-cms', `${PAYLOAD}/admin/login`);
await waitFor('frontend', `${FRONTEND}/api/health`);

await check('payload: admin login page renders', async () => {
  const result = await request(`${PAYLOAD}/admin/login`);
  expectStatus(result, 200);
  if (!result.text.includes('<html')) throw new Error('not an HTML page');
});

await check('payload: REST API answers', async () => {
  const result = await request(`${PAYLOAD}/api/products?limit=1`);
  expectStatus(result, 200);
  if (!Array.isArray(result.json?.docs)) throw new Error('no docs array');
});

await check('payload: GraphQL is disabled', async () => {
  const result = await request(`${PAYLOAD}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' }),
  });
  expectStatus(result, 404);
});

await check('nest: health', async () => {
  expectStatus(await request(`${NEST}/health`), 200);
});

await check('nest: ready (database and Payload reachable)', async () => {
  expectStatus(await request(`${NEST}/health/ready`), 200);
});

// The gateway's return address answers with a redirect to the storefront,
// even for a payment it does not know.
await check('nest: payment callback redirects to the storefront', async () => {
  const result = await request(
    `${NEST}/payment/callback?Authority=A${'0'.repeat(35)}&Status=OK`,
  );
  expectStatus(result, 302);
});

await check('frontend: home page renders', async () => {
  const result = await request(`${FRONTEND}/`);
  expectStatus(result, 200);
  if (!result.text.includes('<html')) throw new Error('not an HTML page');
});

await check('frontend: product listing renders', async () => {
  expectStatus(await request(`${FRONTEND}/products`), 200);
});

await check('frontend: static assets are served', async () => {
  expectStatus(await request(`${FRONTEND}/images/placeholder.png`), 200);
});

await check('register in Payload, log in through Nest', async () => {
  const email = `smoke-${randomBytes(4).toString('hex')}@example.test`;
  const password = randomBytes(12).toString('base64url');

  const registered = await request(`${PAYLOAD}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: FRONTEND },
    body: JSON.stringify({ email, password, displayName: 'Smoke test' }),
  });
  expectStatus(registered, 201);

  const login = await request(`${NEST}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expectStatus(login, 200);
  const token = login.json?.access_token;
  if (typeof token !== 'string') throw new Error('no access token');

  const profile = await request(`${NEST}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expectStatus(profile, 200);
  if (profile.json?.email !== email) throw new Error('wrong profile');
});

if (failures.length > 0) {
  console.log(`\n${failures.length} smoke check(s) failed.`);
  process.exit(1);
}

console.log('\nAll smoke checks passed.');
