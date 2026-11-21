import type { IncomingMessage, ServerResponse } from 'http';
import pino from 'pino';
import { Writable } from 'stream';
import { buildPinoHttpOptions, requestIdFor } from './logging';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function request(headers: Record<string, string> = {}): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

function response() {
  const headers: Record<string, string> = {};
  return {
    headers,
    res: {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      },
    } as unknown as ServerResponse,
  };
}

describe('requestIdFor', () => {
  it('generates an id and returns it in the X-Request-Id header', () => {
    const { res, headers } = response();
    const id = requestIdFor(request(), res);

    expect(id).toMatch(UUID);
    expect(headers['x-request-id']).toBe(id);
  });

  it('keeps a well-formed id sent by a trusted caller', () => {
    const { res } = response();
    expect(
      requestIdFor(request({ 'x-request-id': 'checkout-7f3a.1' }), res),
    ).toBe('checkout-7f3a.1');
  });

  // Anything else could inject text into log lines.
  it.each(['', 'has spaces', 'a'.repeat(65), 'line\nbreak', '<script>'])(
    'replaces the unsafe id %p',
    (value) => {
      const { res } = response();
      expect(requestIdFor(request({ 'x-request-id': value }), res)).toMatch(
        UUID,
      );
    },
  );
});

describe('buildPinoHttpOptions', () => {
  it('never writes credentials to the log', () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const options = buildPinoHttpOptions({
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
    });
    const logger = pino({ redact: options.redact, level: 'info' }, stream);

    logger.info({
      req: {
        headers: {
          authorization: 'Bearer secret-token',
          cookie: 'payload-token=secret-cookie',
        },
      },
      res: { headers: { 'set-cookie': 'session=secret-session' } },
    });

    const output = lines.join('');
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('secret-cookie');
    expect(output).not.toContain('secret-session');
    expect(output).toContain('[Redacted]');
  });

  it('writes plain JSON in production and readable text in development', () => {
    expect(
      buildPinoHttpOptions({ NODE_ENV: 'production', LOG_LEVEL: 'info' })
        .transport,
    ).toBeUndefined();
    expect(
      buildPinoHttpOptions({ NODE_ENV: 'development', LOG_LEVEL: 'info' })
        .transport,
    ).toMatchObject({ target: 'pino-pretty' });
  });
});
