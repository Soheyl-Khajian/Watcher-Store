// e2e/zarinpal-mock/server.mjs
//
// A stand-in for Zarinpal's v4 payment gateway, for end-to-end tests only.
// No dependencies; payments live in memory.
//
//   POST /pg/v4/payment/request.json   register a payment -> { data: { code: 100, authority } }
//   GET  /pg/StartPay/:authority       the "payment page": pays at once and
//                                      sends the browser back to the shop's
//                                      callback (?Authority=&Status=OK);
//                                      ?cancel=1 sends Status=NOK instead
//   POST /pg/v4/payment/verify.json    code 100 the first time, 101 after,
//                                      -51 if not paid, -50 for a wrong amount,
//                                      -54 for an unknown authority
//   GET  /health                       200

import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 4010);
const payments = new Map();
let nextRefId = 100000;

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};
const failure = (res, code, message) =>
  json(res, 200, { data: [], errors: { code, message, validations: [] } });

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) throw new Error('body too large');
  }
  return JSON.parse(raw || '{}');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://mock');
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200).end('ok');
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/pg/v4/payment/request.json'
    ) {
      const body = await readJson(req);
      if (
        !body.merchant_id ||
        !Number.isInteger(body.amount) ||
        !body.callback_url
      ) {
        failure(res, -9, 'validation error');
        return;
      }
      const authority = `A${randomBytes(18).toString('hex').toUpperCase()}`;
      payments.set(authority, {
        amount: body.amount,
        callbackUrl: body.callback_url,
        paid: false,
        verified: false,
        refId: null,
      });
      json(res, 200, {
        data: {
          code: 100,
          message: 'Success',
          authority,
          fee_type: 'Merchant',
          fee: 0,
        },
        errors: [],
      });
      return;
    }

    const start = /^\/pg\/StartPay\/([A-Za-z0-9]+)$/.exec(url.pathname);
    if (req.method === 'GET' && start) {
      const authority = start[1];
      const payment = payments.get(authority);
      if (!payment) {
        res.writeHead(404).end('unknown payment');
        return;
      }
      const cancelled = url.searchParams.get('cancel') === '1';
      if (!cancelled) {
        payment.paid = true;
        payment.refId = nextRefId++;
      }
      const back = new URL(payment.callbackUrl);
      back.searchParams.set('Authority', authority);
      back.searchParams.set('Status', cancelled ? 'NOK' : 'OK');
      res.writeHead(302, { location: back.toString() }).end();
      return;
    }

    if (
      req.method === 'POST' &&
      url.pathname === '/pg/v4/payment/verify.json'
    ) {
      const body = await readJson(req);
      const payment = payments.get(body.authority);
      if (!payment) return failure(res, -54, 'unknown authority');
      if (!payment.paid) return failure(res, -51, 'payment failed');
      if (payment.amount !== body.amount)
        return failure(res, -50, 'amount mismatch');
      const code = payment.verified ? 101 : 100;
      payment.verified = true;
      json(res, 200, {
        data: {
          code,
          message: code === 100 ? 'Paid' : 'Verified',
          ref_id: payment.refId,
          card_pan: '502229******5995',
          card_hash: 'mock',
          fee_type: 'Merchant',
          fee: 0,
        },
        errors: [],
      });
      return;
    }

    res.writeHead(404).end('not found');
  } catch {
    if (!res.headersSent) res.writeHead(400).end('bad request');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Zarinpal mock listening on ${PORT}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
