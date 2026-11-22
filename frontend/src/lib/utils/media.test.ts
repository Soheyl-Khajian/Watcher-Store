import { describe, expect, it } from 'vitest';
import { mediaSrc } from './media';

// NEXT_PUBLIC_PAYLOAD_URL is https://cms.example.test/api in vitest.config.mts.
describe('mediaSrc', () => {
  it.each([
    ['/api/media/file/camera.png', '/uploads/camera.png'],
    [
      'https://cms.example.test/api/media/file/camera.png',
      '/uploads/camera.png',
    ],
    [
      'https://cms.example.test/api/media/file/camera-480x320.webp?2026-11-20T15%3A26%3A40.215Z',
      '/uploads/camera-480x320.webp',
    ],
    // Names stay encoded as Payload sent them.
    [
      '/api/media/file/%D8%AF%D9%88%D8%B1%D8%A8%DB%8C%D9%86.jpg',
      '/uploads/%D8%AF%D9%88%D8%B1%D8%A8%DB%8C%D9%86.jpg',
    ],
  ])('serves Payload file %s from the storefront as %s', (url, expected) => {
    expect(mediaSrc(url)).toBe(expected);
  });

  it.each([
    'https://cdn.example.test/camera.png',
    'http://images.example.test/a.jpg',
    // Same path on another site is not Payload's file.
    'https://evil.example.test/api/media/file/camera.png',
  ])('keeps the absolute URL %s unchanged', (url) => {
    expect(mediaSrc(url)).toBe(url);
  });

  it.each([
    // Not a single file name under /api/media/file/.
    '/api/media/file/',
    '/api/media/file/a/b.png',
    '/api/users',
    'javascript:alert(1)',
  ])('shows nothing for %s', (url) => {
    expect(mediaSrc(url)).toBe('');
  });

  it.each([null, undefined, ''])('returns an empty string for %p', (value) => {
    expect(mediaSrc(value)).toBe('');
  });
});
