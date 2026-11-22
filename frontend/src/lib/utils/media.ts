// frontend/src/lib/utils/media.ts
//
// Where the storefront shows a Payload media file from. Payload serves
// files at /api/media/file/<name> (from local disk or an S3 bucket); the
// storefront shows them from its own /uploads/<name> (app/uploads), which
// fetches them from Payload's internal address. Same-origin images let
// next/image optimize them wherever the storefront runs (its server need
// not reach Payload's public address), and the CSP allows images only from
// the shop itself.

import { env } from '@/lib/env';

const payloadOrigin = new URL(env.NEXT_PUBLIC_PAYLOAD_URL).origin;

export const UPLOADS_PATH = '/uploads/';
const PAYLOAD_FILE_PATH = '/api/media/file/';

// A Payload media URL (relative, or absolute on Payload's public origin) as
// a storefront /uploads/ path; any other URL unchanged; '' for none.
export function mediaSrc(mediaUrl: string | null | undefined): string {
  if (!mediaUrl) return '';

  let url: URL;
  try {
    url = new URL(mediaUrl, `${payloadOrigin}/`);
  } catch {
    return '';
  }

  const name = url.pathname.startsWith(PAYLOAD_FILE_PATH)
    ? url.pathname.slice(PAYLOAD_FILE_PATH.length)
    : '';
  if (url.origin === payloadOrigin && name && !name.includes('/')) {
    // Payload adds ?<timestamp> to some URLs; the file name is enough.
    return `${UPLOADS_PATH}${name}`;
  }

  return /^https?:\/\//i.test(mediaUrl) ? mediaUrl : '';
}
