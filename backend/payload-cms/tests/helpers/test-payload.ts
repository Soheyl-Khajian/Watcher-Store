// backend/payload-cms/tests/helpers/test-payload.ts
//
// Boots Payload against a throwaway Postgres database and runs the project's
// migrations, exactly as a deployment would.
//
// Requests go through Payload's real REST stack (handleEndpoints), so tests
// cover authentication, access control and custom endpoints the way the
// storefront and admin panel reach them, without starting Next.js.
//
// Connection: TEST_DATABASE_URL points at any database on a Postgres server
// where the user may create databases. Default: a local Postgres.

import { randomBytes } from 'crypto';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Pool } from 'pg';
import type { Payload, SanitizedConfig } from 'payload';
import { getPayload, handleEndpoints } from 'payload';
import sharp from 'sharp';

const DEFAULT_ADMIN_URL =
  'postgres://postgres:postgres@localhost:5432/postgres';
const SCHEMA = 'payload_schema';
export const TEST_PASSWORD = 'correct-horse-battery';

type Json = Record<string, unknown>;
type MigrationList = NonNullable<
  Parameters<Payload['db']['migrate']>[0]
>['migrations'];

export interface ApiResponse {
  status: number;
  body: Json;
  headers: Headers;
}

// The public CMS URL the test instance runs under (https, so auth cookies are
// marked Secure, as in production).
export const TEST_SERVER_URL = 'https://cms.example.test';
export const TEST_FRONTEND_URL = 'https://shop.example.test';
// What the storefront sends with each sign-up (access/registration.ts).
export const TEST_REGISTRATION_SECRET = 'registration-'.padEnd(48, 'x');
export const REGISTRATION_HEADERS = {
  'X-Registration-Secret': TEST_REGISTRATION_SECRET,
};

export interface TestPayload {
  payload: Payload;
  // Calls the REST API, e.g. api('GET', '/products?limit=5', { token }).
  api(
    method: string,
    path: string,
    options?: {
      token?: string;
      body?: unknown;
      // Sent as multipart/form-data instead of JSON (file uploads).
      form?: FormData;
      headers?: Record<string, string>;
    },
  ): Promise<ApiResponse>;
  createUser(
    email: string,
    role?: 'admin' | 'customer',
  ): Promise<{ id: number; token: string }>;
  // Uploads a small PNG through the REST API and returns the media id.
  uploadImage(token: string, alt?: string): Promise<number>;
  close(): Promise<void>;
}

export async function createTestPayload(): Promise<TestPayload> {
  const adminUrl = new URL(process.env.TEST_DATABASE_URL ?? DEFAULT_ADMIN_URL);
  const databaseName = `payload_int_${process.pid}_${randomBytes(4).toString('hex')}`;

  const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);

  const testUrl = new URL(adminUrl.toString());
  testUrl.pathname = `/${databaseName}`;

  const dropDatabase = async () => {
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  };

  let payload: Payload | undefined;
  let config: SanitizedConfig;
  const cacheKey = databaseName;
  // Uploaded files go to a temporary folder, never to the project's media/.
  const mediaDir = await mkdtemp(join(tmpdir(), 'payload-media-'));

  try {
    const db = new Pool({ connectionString: testUrl.toString(), max: 1 });
    await db.query(`CREATE SCHEMA "${SCHEMA}"`);
    await db.end();

    // src/env.ts validates process.env when the config is first imported.
    Object.assign(process.env, {
      DATABASE_URI: testUrl.toString(),
      PAYLOAD_SCHEMA: SCHEMA,
      PAYLOAD_SECRET: randomBytes(32).toString('hex'),
      FRONTEND_URL: TEST_FRONTEND_URL,
      PAYLOAD_PUBLIC_URL: TEST_SERVER_URL,
      REGISTRATION_SECRET: TEST_REGISTRATION_SECRET,
    });

    config = await (await import('../../src/payload.config')).default;
    for (const collection of config.collections) {
      if (collection.upload) {
        collection.upload.staticDir = mediaDir;
      }
    }
    payload = await getPayload({ config, key: cacheKey });

    // Pass the generated migration list instead of letting Payload import
    // the .ts files itself: its native import() bypasses the TypeScript
    // transform that Vitest applies here.
    const { migrations } = await import('../../src/migrations');
    await payload.db.migrate({
      migrations: migrations as unknown as MigrationList,
    });
  } catch (error) {
    await payload?.destroy().catch(() => undefined);
    await dropDatabase().catch(() => undefined);
    await rm(mediaDir, { recursive: true, force: true });
    throw error;
  }

  const instance = payload;

  const api: TestPayload['api'] = async (method, path, options = {}) => {
    const headers = new Headers(options.headers);
    if (options.token) {
      headers.set('Authorization', `JWT ${options.token}`);
    }
    if (options.body !== undefined && !options.form) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await handleEndpoints({
      config,
      payloadInstanceCacheKey: cacheKey,
      request: new Request(`${TEST_SERVER_URL}/api${path}`, {
        method,
        headers,
        body:
          options.form ??
          (options.body === undefined
            ? undefined
            : JSON.stringify(options.body)),
      }),
    });

    const text = await response.text();
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Json) : {},
      headers: response.headers,
    };
  };

  const createUser: TestPayload['createUser'] = async (
    email,
    role = 'customer',
  ) => {
    const user = await instance.create({
      collection: 'users',
      data: { email, password: TEST_PASSWORD, role, displayName: email },
    });
    const login = await api('POST', '/users/login', {
      body: { email, password: TEST_PASSWORD },
    });
    if (login.status !== 200 || typeof login.body.token !== 'string') {
      throw new Error(`Could not log in ${email}: HTTP ${login.status}`);
    }
    return { id: user.id, token: login.body.token };
  };

  const uploadImage: TestPayload['uploadImage'] = async (
    token,
    alt = 'image',
  ) => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#2c3e50' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append('file', new Blob([png], { type: 'image/png' }), `${alt}.png`);
    form.append('_payload', JSON.stringify({ alt }));

    const response = await api('POST', '/media', { token, form });
    if (response.status !== 201) {
      throw new Error(`Could not upload ${alt}: HTTP ${response.status}`);
    }
    return (response.body.doc as { id: number }).id;
  };

  const close = async () => {
    // The adapter's destroy() leaves its pg pool open, and the pool never
    // drains. Dropping the database WITH (FORCE) ends those connections on
    // the server side; the listener turns the resulting "terminating
    // connection" events into no-ops instead of unhandled errors.
    const pool = (instance.db as unknown as { pool?: Pool }).pool;
    pool?.on('error', () => undefined);
    await instance.destroy();
    await dropDatabase();
    await rm(mediaDir, { recursive: true, force: true });
  };

  return { payload: instance, api, createUser, uploadImage, close };
}
