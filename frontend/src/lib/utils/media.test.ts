import { describe, expect, it } from 'vitest';
import { resolvePayloadMediaUrl } from './media';

// NEXT_PUBLIC_PAYLOAD_URL is https://cms.example.test/api in vitest.config.mts.
describe('resolvePayloadMediaUrl', () => {
  it('resolves a Payload media path against the Payload origin', () => {
    expect(resolvePayloadMediaUrl('/api/media/file/camera.png')).toBe(
      'https://cms.example.test/api/media/file/camera.png',
    );
  });

  it('does not add a second /api prefix', () => {
    expect(resolvePayloadMediaUrl('/api/media/file/a.png')).not.toContain(
      '/api/api/',
    );
  });

  it.each([
    'https://cdn.example.test/camera.png',
    'http://images.example.test/a.jpg',
    'HTTPS://CDN.EXAMPLE.TEST/b.webp',
  ])('keeps the absolute URL %s unchanged', (url) => {
    expect(resolvePayloadMediaUrl(url)).toBe(url);
  });

  it.each([null, undefined, ''])('returns an empty string for %p', (value) => {
    expect(resolvePayloadMediaUrl(value)).toBe('');
  });
});
