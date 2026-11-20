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

export interface PayloadStub {
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

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
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
    url: `http://127.0.0.1:${port}/api`,
    users,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
