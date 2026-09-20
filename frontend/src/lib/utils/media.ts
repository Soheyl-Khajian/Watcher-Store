// frontend/src/lib/utils/media.ts
import { env } from '@/lib/env';

const payloadOrigin = new URL(env.NEXT_PUBLIC_PAYLOAD_URL).origin;

export function resolvePayloadMediaUrl(
  mediaUrl: string | null | undefined,
): string {
  if (!mediaUrl) return '';

  // Preserve already-absolute external URLs.
  if (/^https?:\/\//i.test(mediaUrl)) {
    return mediaUrl;
  }

  // Payload returns paths such as /api/media/file/image.png.
  return new URL(mediaUrl, `${payloadOrigin}/`).toString();
}