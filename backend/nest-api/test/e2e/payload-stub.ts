// backend/nest-api/test/e2e/payload-stub.ts
//
// A minimal stand-in for the Payload REST endpoints Nest calls:
//   POST /api/users/login   storefront login
//   GET  /api/users/me      admin session lookup (Authorization: JWT <token>)
//   GET  /api/products/:id  product details for cart and checkout
//
// Products are read from the fixture tables, so HTTP reads and Nest's direct
// SQL stock updates always agree. Like Payload, the stub hides the role field
// from non-administrators and hides draft products.

import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import type { AddressInfo } from 'net';
import type { Pool } from 'pg';
import type { FixtureUser } from './payload-fixture';
import { readProduct } from './payload-fixture';

// How the stub answers, to test Nest against an unhealthy Payload:
// - normal: like Payload
// - error: HTTP 500 for every request
// - slow: like Payload, but only after SLOW_RESPONSE_MS
// - garbage: HTTP 200 with a body that is not JSON
// - hang-up: closes the connection without answering
export type StubMode = 'normal' | 'error' | 'slow' | 'garbage' | 'hang-up';
export const SLOW_RESPONSE_MS = 2000;

export interface PayloadStub {
  mode: StubMode;
  url: string;
  users: Map<string, FixtureUser>;
  close(): Promise<void>;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

// What Payload returns for a user: the role only for administrators.
function publicUser(user: FixtureUser) {
  return user.role === 'admin'
    ? { id: user.id, email: user.email, role: user.role }
    : { id: user.id, email: user.email };
}

export async function startPayloadStub(pool: Pool): Promise<PayloadStub> {
  const users = new Map<string, FixtureUser>();

  const stub = { mode: 'normal' as StubMode };

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    switch (stub.mode) {
      case 'error':
        return send(res, 500, {
          errors: [{ message: 'Something went wrong.' }],
        });
      case 'garbage':
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<html>maintenance</html>');
      case 'hang-up':
        return req.socket.destroy();
      case 'slow':
        await new Promise((resolve) => setTimeout(resolve, SLOW_RESPONSE_MS));
        break;
      default:
        break;
    }

    const url = new URL(req.url ?? '/', 'http://stub');

    if (req.method === 'POST' && url.pathname === '/api/users/login') {
      const body = (await readJson(req)) as {
        email?: string;
        password?: string;
      } | null;
      const user = body?.email ? users.get(body.email) : undefined;

      if (!user || user.password !== body?.password) {
        return send(res, 401, {
          errors: [{ message: 'The email or password provided is incorrect.' }],
        });
      }
      return send(res, 200, {
        user: publicUser(user),
        token: user.payloadToken,
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/users/me') {
      const token = req.headers.authorization?.replace(/^JWT /, '');
      const user = [...users.values()].find((u) => u.payloadToken === token);
      return send(res, 200, { user: user ? publicUser(user) : null });
    }

    const productMatch = /^\/api\/products\/(\d+)$/.exec(url.pathname);
    if (req.method === 'GET' && productMatch) {
      const product = await readProduct(pool, Number(productMatch[1]));

      if (!product || product.status !== 'published') {
        return send(res, 404, { errors: [{ message: 'Not Found' }] });
      }
      return send(res, 200, product);
    }

    send(res, 404, { errors: [{ message: 'Not Found' }] });
  };

  const server: Server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      send(res, 500, { errors: [{ message: String(error) }] });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    get mode() {
      return stub.mode;
    },
    set mode(mode: StubMode) {
      stub.mode = mode;
    },
    url: `http://127.0.0.1:${port}/api`,
    users,
    close: () =>
      new Promise<void>((resolve, reject) => {
        // Slow responses may still be pending.
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
