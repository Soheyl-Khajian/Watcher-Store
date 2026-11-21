// backend/nest-api/test/e2e/harness.ts
//
// Boots the real Nest application against a throwaway Postgres database.
//
// Each test file gets its own database (created here, dropped in close()), so
// files can run in parallel and never share state. Nest runs its migrations
// on boot exactly as in production.
//
// Connection: TEST_DATABASE_URL points at any database on a Postgres server
// where the user may create databases. Default: a local Postgres.
//   Dev container:  TEST_DATABASE_URL=postgres://postgres:postgres@db:5432/postgres

import { randomBytes } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import {
  createPayloadFixtureSchema,
  FixtureProductInput,
  FixtureUser,
  PAYLOAD_SCHEMA,
} from './payload-fixture';
import { startPayloadStub, PayloadStub } from './payload-stub';

const DEFAULT_ADMIN_URL =
  'postgres://postgres:postgres@localhost:5432/postgres';

export interface TestApp {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  db: Pool;
  createUser(input: {
    email: string;
    password?: string;
    role?: 'admin' | 'customer';
  }): Promise<FixtureUser>;
  createProduct(input: FixtureProductInput): Promise<number>;
  login(user: FixtureUser): Promise<string>;
  // The JWT secret this app signs with, for tests that forge tokens.
  jwtSecret: string;
  close(): Promise<void>;
}

function randomToken(): string {
  const part = () => randomBytes(12).toString('base64url');
  return `${part()}.${part()}.${part()}`;
}

// Waits (up to timeoutMs) until no session is connected to the database.
async function waitForNoSessions(
  admin: Pool,
  databaseName: string,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { rows } = await admin.query(
      'SELECT count(*)::int AS sessions FROM pg_stat_activity WHERE datname = $1',
      [databaseName],
    );
    if (rows[0].sessions === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// Starts the stub and the application inside an already-created database.
async function boot(
  adminUrl: URL,
  databaseName: string,
  db: Pool,
  started: { stub?: PayloadStub; app?: NestExpressApplication },
  envOverrides: Record<string, string>,
): Promise<void> {
  await createPayloadFixtureSchema(db);
  started.stub = await startPayloadStub(db);

  // src/env.ts reads process.env on first import, so configure it before
  // loading any application module. Each test file has its own module
  // registry, so every file gets its own configuration.
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_HOST: adminUrl.hostname,
    DATABASE_PORT: adminUrl.port || '5432',
    POSTGRES_USER: decodeURIComponent(adminUrl.username),
    POSTGRES_PASSWORD: decodeURIComponent(adminUrl.password),
    POSTGRES_DB: databaseName,
    NEST_SCHEMA: 'nest_schema',
    PAYLOAD_SCHEMA,
    JWT_SECRET: randomBytes(32).toString('hex'),
    PAYLOAD_INTERNAL_URL: started.stub.url,
    FRONTEND_URL: 'http://localhost:3002',
    PENDING_ORDER_TTL_HOURS: '24',
    // The simulated payment flow is the only payment flow until a real
    // gateway exists; tests exercise it explicitly.
    ALLOW_MOCK_PAYMENT: 'true',
    // Generous limits so suites can log in and order freely; the rate
    // limiting suite sets the production values through envOverrides.
    RATE_LIMIT_PER_MINUTE: '10000',
    RATE_LIMIT_LOGIN_PER_MINUTE: '10000',
    RATE_LIMIT_ORDERS_PER_MINUTE: '10000',
    ...envOverrides,
  });

  const { ensureSchema } = await import('../../src/database/ensure-schema');
  const { AppModule } = await import('../../src/app.module');
  const { configureApp } = await import('../../src/app.setup');

  await ensureSchema();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  started.app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: ['error'],
    bodyParser: false,
  });
  configureApp(started.app);
  await started.app.init();
}

// envOverrides replaces individual settings for this test file's app.
export async function createTestApp(
  envOverrides: Record<string, string> = {},
): Promise<TestApp> {
  const adminUrl = new URL(process.env.TEST_DATABASE_URL ?? DEFAULT_ADMIN_URL);
  const databaseName = `nest_e2e_${process.pid}_${randomBytes(4).toString('hex')}`;

  const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
  await admin.query(`CREATE DATABASE "${databaseName}"`);

  const testUrl = new URL(adminUrl.toString());
  testUrl.pathname = `/${databaseName}`;
  const db = new Pool({ connectionString: testUrl.toString(), max: 4 });

  const started: { stub?: PayloadStub; app?: NestExpressApplication } = {};

  const close = async () => {
    // TypeORM's pool resolves end() before Postgres has finished closing its
    // sessions. Ignore the "terminating connection" notice a lingering
    // session may still receive, then wait for the sessions to go away so
    // the database can be dropped without killing anything.
    if (started.app) {
      const { DataSource } = await import('typeorm');
      const driver = started.app.get(DataSource).driver as {
        master?: Pool;
      };
      driver.master?.on('error', () => undefined);
    }

    await started.app?.close();
    await started.stub?.close();
    await db.end();
    await waitForNoSessions(admin, databaseName);
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  };

  try {
    await boot(adminUrl, databaseName, db, started, envOverrides);
  } catch (error) {
    // Do not leave the database behind when the application fails to start.
    await close().catch(() => undefined);
    throw error;
  }

  const app = started.app as INestApplication;
  const stub = started.stub as PayloadStub;

  const createUser: TestApp['createUser'] = async ({
    email,
    password = 'correct-horse-battery',
    role = 'customer',
  }) => {
    const { rows } = await db.query(
      `INSERT INTO "${PAYLOAD_SCHEMA}"."users" ("email", "role")
       VALUES ($1, $2) RETURNING "id"`,
      [email, role],
    );
    const user: FixtureUser = {
      id: rows[0].id,
      email,
      password,
      role,
      payloadToken: randomToken(),
    };
    stub.users.set(email, user);
    return user;
  };

  const createProduct: TestApp['createProduct'] = async ({
    name = 'Test product',
    status = 'published',
    price,
    salePrice = null,
    isOnSale = false,
    stock = 10,
  }) => {
    const { rows } = await db.query(
      `INSERT INTO "${PAYLOAD_SCHEMA}"."products"
         ("name", "status", "price", "sale_price", "is_on_sale", "stock")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING "id"`,
      [name, status, price, salePrice, isOnSale, stock],
    );
    return rows[0].id;
  };

  const http = () => request(app.getHttpServer());

  const login = async (user: FixtureUser): Promise<string> => {
    const response = await http()
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    return response.body.access_token as string;
  };

  return {
    app,
    http,
    db,
    createUser,
    createProduct,
    login,
    jwtSecret: process.env.JWT_SECRET as string,
    close,
  };
}
