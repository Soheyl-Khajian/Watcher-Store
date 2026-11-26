// frontend/src/app/api/revalidate/route.ts
//
// POST /api/revalidate  { "tags": ["products"] }
// Authorization: Bearer <REVALIDATE_SECRET>
//
// Payload calls this after content changes, so pages drop their cached
// copy of it. Server to server only: without REVALIDATE_SECRET configured
// the endpoint does not exist, and a wrong secret is refused.

import { createHash, timingSafeEqual } from 'crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { isCacheTag } from '@/lib/cache-tags';

// Compares digests, which always have the same length, so neither the
// answer nor its timing says how long the secret is.
function secretMatches(given: string, expected: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const header = request.headers.get('authorization') ?? '';
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!secretMatches(given, secret)) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let tags: unknown;
  try {
    tags = ((await request.json()) as { tags?: unknown } | null)?.tags;
  } catch {
    tags = undefined;
  }
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every(isCacheTag)) {
    return NextResponse.json(
      { message: 'tags must be a non-empty list of known cache tags' },
      { status: 400 },
    );
  }

  for (const tag of new Set(tags)) {
    revalidateTag(tag);
  }
  return NextResponse.json({ revalidated: [...new Set(tags)] });
}
