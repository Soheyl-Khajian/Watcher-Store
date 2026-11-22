// frontend/src/lib/server/readiness.ts
//
// Whether the storefront can serve pages right now (GET /api/health/ready).
// Pages need Payload (catalog and content) and the account pages need Nest,
// so both are probed, in parallel.

import { serverEnv } from './bff';

// A check slower than this counts as down; the caller is usually a probe
// with a short timeout of its own.
export const READY_CHECK_TIMEOUT_MS = 3000;

type CheckState = 'up' | 'down';

export interface ReadinessBody {
  status: 'ok' | 'unavailable';
  checks: { payload: CheckState; nest: CheckState };
}

async function probe(
  url: string,
  isUp: (status: number) => boolean,
): Promise<CheckState> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(READY_CHECK_TIMEOUT_MS),
    });
    await response.body?.cancel();
    return isUp(response.status) ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export async function checkReadiness(): Promise<ReadinessBody> {
  const { payloadUrl, nestUrl } = serverEnv();
  const [payload, nest] = await Promise.all([
    // Answers for anonymous visitors too; only an error means trouble.
    probe(`${payloadUrl}/users/me`, (status) => status < 500),
    // Nest's own liveness: whether it can reach its database and Payload
    // is its readiness check's business.
    probe(`${nestUrl}/health`, (status) => status === 200),
  ]);
  const ok = payload === 'up' && nest === 'up';
  return { status: ok ? 'ok' : 'unavailable', checks: { payload, nest } };
}
