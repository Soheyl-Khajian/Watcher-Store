// backend/payload-cms/src/hooks/revalidateStorefront.ts
//
// After content changes, tells the storefront to drop its cached copy
// (POST <storefront>/api/revalidate with the shared REVALIDATE_SECRET), so
// edits show up at once instead of when the storefront's cache runs out
// (an hour for most content).
//
// Best effort: it never blocks or fails the save in the admin panel. If the
// storefront cannot be reached the edit still appears when the cache runs
// out. Does nothing unless STOREFRONT_INTERNAL_URL and REVALIDATE_SECRET
// are set.

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload';
import { env } from '../env';

// Must match the storefront's cache tags (frontend/src/lib/cache-tags.ts).
export type StorefrontCacheTag =
  'products' | 'categories' | 'posts' | 'pages' | 'footer';

const TIMEOUT_MS = 3000;

interface Logger {
  error: (message: string) => void;
}

export async function requestRevalidation(
  tags: StorefrontCacheTag[],
  logger: Logger,
): Promise<void> {
  if (!env.STOREFRONT_INTERNAL_URL || !env.REVALIDATE_SECRET) {
    return;
  }
  try {
    const response = await fetch(
      `${env.STOREFRONT_INTERNAL_URL}/api/revalidate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.REVALIDATE_SECRET}`,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      logger.error(
        `Storefront revalidation of ${tags.join(', ')} answered HTTP ${response.status}.`,
      );
    }
  } catch (error) {
    logger.error(
      `Storefront revalidation of ${tags.join(', ')} failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }
}

// Not awaited: the editor's save does not wait for the storefront.
// A bulk change (the category price tool) passes
// context.skipRevalidation and asks once, after its commit.
export const revalidateAfterChange =
  (...tags: StorefrontCacheTag[]): CollectionAfterChangeHook =>
  ({ doc, req, context }) => {
    if (!context?.skipRevalidation) {
      void requestRevalidation(tags, req.payload.logger);
    }
    return doc;
  };

export const revalidateAfterDelete =
  (...tags: StorefrontCacheTag[]): CollectionAfterDeleteHook =>
  ({ doc, req }) => {
    void requestRevalidation(tags, req.payload.logger);
    return doc;
  };

export const revalidateGlobalAfterChange =
  (...tags: StorefrontCacheTag[]): GlobalAfterChangeHook =>
  ({ doc, req }) => {
    void requestRevalidation(tags, req.payload.logger);
    return doc;
  };
