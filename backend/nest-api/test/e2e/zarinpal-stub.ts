// backend/nest-api/test/e2e/zarinpal-stub.ts
//
// A stand-in for Zarinpal's v4 API, answering the way the real one does:
//   POST /pg/v4/payment/request.json  -> { data: { code: 100, authority }, errors: [] }
//   POST /pg/v4/payment/verify.json   -> code 100 the first time, 101 after,
//                                        or errors -50 / -51 / -54
// Tests play the customer with pay(): until then, verification answers -51.

import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import type { AddressInfo } from 'net';

// How the stub answers, to test Nest against an unhealthy gateway:
// - normal: like Zarinpal
// - error: HTTP 500
// - hang-up: closes the connection without answering
// - garbage: HTTP 200 with a body that is not JSON
export type ZarinpalMode = 'normal' | 'error' | 'hang-up' | 'garbage';

export const CARD_PAN = '502229******5995';

interface StubPayment {
  amount: number;
  callbackUrl: string;
  // Set by pay(): the amount the customer actually paid.
  paidAmount: number | null;
  refId: number | null;
}

export interface ZarinpalStub {
  url: string;
  mode: ZarinpalMode;
  // Every request body received, by path.
  requests: { path: string; body: Record<string, unknown> }[];
  // The customer pays at the gateway (by default exactly the requested
  // amount).
  pay(authority: string, amount?: number): void;
  close(): Promise<void>;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function fail(res: ServerResponse, code: number, message: string): void {
  send(res, 422, { data: [], errors: { code, message, validations: [] } });
}

async function readJson(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

export async function startZarinpalStub(
  merchantId: string,
): Promise<ZarinpalStub> {
  const payments = new Map<string, StubPayment>();
  const requests: ZarinpalStub['requests'] = [];
  const state = { mode: 'normal' as ZarinpalMode };
  let nextAuthority = 217_885_159;
  let nextRefId = 201;

  const handle = async (req: IncomingMessage, res: ServerResponse) => {
    const path = new URL(req.url ?? '/', 'http://stub').pathname;
    const body = await readJson(req);
    requests.push({ path, body });

    switch (state.mode) {
      case 'error':
        return send(res, 500, { message: 'Internal error' });
      case 'hang-up':
        return req.socket.destroy();
      case 'garbage':
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<html>maintenance</html>');
      default:
        break;
    }

    if (req.method !== 'POST') {
      return send(res, 404, {});
    }

    if (body.merchant_id !== merchantId) {
      return fail(res, -10, 'Terminal is not valid.');
    }

    if (path === '/pg/v4/payment/request.json') {
      if (typeof body.amount !== 'number' || body.amount < 1000) {
        return fail(res, -9, 'The input params invalid, validation error.');
      }
      const authority = `A${String(nextAuthority++).padStart(35, '0')}`;
      payments.set(authority, {
        amount: body.amount,
        callbackUrl: String(body.callback_url),
        paidAmount: null,
        refId: null,
      });
      return send(res, 200, {
        data: {
          code: 100,
          message: 'Success',
          authority,
          fee_type: 'Merchant',
          fee: 0,
        },
        errors: [],
      });
    }

    if (path === '/pg/v4/payment/verify.json') {
      const payment = payments.get(String(body.authority));
      if (!payment) {
        return fail(res, -54, 'Invalid authority.');
      }
      if (payment.paidAmount === null) {
        return fail(
          res,
          -51,
          'Session is not valid, session is not active paid try.',
        );
      }
      if (payment.paidAmount !== body.amount) {
        return fail(
          res,
          -50,
          'Session is not valid, amounts values is not the same.',
        );
      }

      const alreadyVerified = payment.refId !== null;
      payment.refId ??= nextRefId++;
      return send(res, 200, {
        data: {
          code: alreadyVerified ? 101 : 100,
          message: alreadyVerified ? 'Verified' : 'Paid',
          card_hash:
            '1EBE3EBEBE35C7EC0F8D6EE4F2F859107A87822CA179BC9528767EA7B5489B69',
          card_pan: CARD_PAN,
          ref_id: payment.refId,
          fee_type: 'Merchant',
          fee: 0,
        },
        errors: [],
      });
    }

    send(res, 404, {});
  };

  const server: Server = createServer((req, res) => {
    handle(req, res).catch((error: unknown) => {
      send(res, 500, { message: String(error) });
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    get mode() {
      return state.mode;
    },
    set mode(mode: ZarinpalMode) {
      state.mode = mode;
    },
    requests,
    pay(authority, amount) {
      const payment = payments.get(authority);
      if (!payment) {
        throw new Error(`No payment with authority ${authority}`);
      }
      payment.paidAmount = amount ?? payment.amount;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
