// frontend/src/lib/cache-tags.ts
//
// Cache tags for Payload data. Pages cache Payload answers under these tags;
// Payload asks the storefront to drop a tag when that content changes
// (POST /api/revalidate), so edits show up at once instead of when the
// cache runs out.

export const CACHE_TAGS = [
  'products',
  'categories',
  'posts',
  'pages',
  'footer',
] as const;

export type CacheTag = (typeof CACHE_TAGS)[number];

export function isCacheTag(value: unknown): value is CacheTag {
  return CACHE_TAGS.includes(value as CacheTag);
}
