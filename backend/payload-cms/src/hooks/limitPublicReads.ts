// backend/payload-cms/src/hooks/limitPublicReads.ts
//
// Bounds what one REST read by anyone but an administrator may ask for, so
// a single request cannot make the CMS load and populate a whole
// collection (?limit=0, ?pagination=false, ?depth=10). The storefront asks
// for at most MAX_PUBLIC_LIMIT documents at depth 2; the admin panel and
// server code (the local API) are not limited.

import type { CollectionBeforeOperationHook } from 'payload';

export const MAX_PUBLIC_LIMIT = 200;
export const MAX_PUBLIC_DEPTH = 2;

interface ReadArgs {
  limit?: number;
  depth?: number;
  pagination?: boolean;
}

export function boundedRead<T extends ReadArgs>(args: T): T & ReadArgs {
  const bounded: T & ReadArgs = { ...args, pagination: true };
  if (
    args.pagination === false ||
    args.limit === 0 ||
    (typeof args.limit === 'number' &&
      (args.limit < 0 || args.limit > MAX_PUBLIC_LIMIT))
  ) {
    bounded.limit = MAX_PUBLIC_LIMIT;
  }
  if (typeof args.depth === 'number' && args.depth > MAX_PUBLIC_DEPTH) {
    bounded.depth = MAX_PUBLIC_DEPTH;
  }
  return bounded;
}

export const limitPublicReads: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (
    operation !== 'read' ||
    req.payloadAPI !== 'REST' ||
    req.user?.role === 'admin'
  ) {
    return args;
  }
  return boundedRead(args as typeof args & ReadArgs);
};
