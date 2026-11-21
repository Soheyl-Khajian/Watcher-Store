// backend/nest-api/src/logging/logging.ts
//
// Structured logging with pino: JSON lines in production, readable text in
// development. Each HTTP request is logged once, with a request id that is
// also returned in the X-Request-Id header (and in error responses), so a
// customer's report can be matched with the server's log line.

import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Options } from 'pino-http';
import type { Env } from '../env';

export const REQUEST_ID_HEADER = 'x-request-id';

// Ids from callers (a frontend or proxy) are kept only if they are short and
// plain, so they cannot inject text into log lines.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestIdFor(
  req: IncomingMessage,
  res: ServerResponse,
): string {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();

  res.setHeader('X-Request-Id', id);
  return id;
}

export function buildPinoHttpOptions(
  env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>,
): Options {
  return {
    level: env.LOG_LEVEL,
    genReqId: requestIdFor,
    // Credentials never reach the log.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[Redacted]',
    },
    // Health probes poll these constantly.
    autoLogging: {
      ignore: (req) =>
        req.url === '/health' || (req.url ?? '').startsWith('/health/'),
    },
    // Keep request lines short: no headers or bodies.
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
  };
}
