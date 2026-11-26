// frontend/src/lib/server/startup-check.ts
//
// Settings checked once when the server starts (instrumentation.ts), so a
// wrong one stops the storefront with a clear message instead of failing
// every request, health checks included, until someone reads the logs.

import { parseLocaleSettings } from '@/i18n/settings';
import { serverEnv } from './bff';

export function startupProblems(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const problems: string[] = [];

  try {
    parseLocaleSettings({
      DEFAULT_LOCALE: env.DEFAULT_LOCALE,
      ENABLED_LOCALES: env.ENABLED_LOCALES,
      STORE_TIME_ZONE: env.STORE_TIME_ZONE,
    });
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error));
  }

  try {
    serverEnv();
  } catch (error) {
    problems.push(
      `Storefront server settings are invalid: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  // Without it the CMS refuses every sign-up.
  if (env.NODE_ENV === 'production' && !env.REGISTRATION_SECRET) {
    problems.push(
      'REGISTRATION_SECRET must be set in production, the same value as the CMS has. Generate one with: openssl rand -hex 32',
    );
  }

  // Without it the build falls back to http://localhost:3002: every login
  // and checkout is refused as cross-site, the session cookie is not
  // Secure, and canonical and sitemap addresses point at localhost.
  if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_FRONTEND_URL) {
    problems.push(
      'NEXT_PUBLIC_FRONTEND_URL must be set when the storefront is built and run in production: its public address, such as https://shop.example.',
    );
  }

  return problems;
}

export function stopOnStartupProblems(): void {
  const problems = startupProblems();
  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`The storefront cannot start:\n- ${problems.join('\n- ')}`);
    process.exit(1);
  }
}
