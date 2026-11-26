import { describe, expect, it } from 'vitest';
import { startupProblems } from './startup-check';

const fine = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_FRONTEND_URL: 'https://shop.example',
  REGISTRATION_SECRET: 'a'.repeat(64),
} as NodeJS.ProcessEnv;

describe('startup check', () => {
  it('accepts a production storefront with its address', () => {
    expect(startupProblems(fine)).toEqual([]);
  });

  it('needs the public address in production', () => {
    const problems = startupProblems({
      ...fine,
      NEXT_PUBLIC_FRONTEND_URL: undefined,
    });
    expect(problems).toEqual([
      expect.stringContaining('NEXT_PUBLIC_FRONTEND_URL'),
    ]);
  });

  it('needs the registration secret in production', () => {
    expect(
      startupProblems({ ...fine, REGISTRATION_SECRET: undefined }),
    ).toEqual([expect.stringContaining('REGISTRATION_SECRET')]);
  });

  it('does not need it in development', () => {
    expect(
      startupProblems({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toEqual([]);
  });

  it('reports a language setting the deployment cannot use', () => {
    expect(startupProblems({ ...fine, ENABLED_LOCALES: 'fa,xx' })).toEqual([
      expect.stringContaining('ENABLED_LOCALES'),
    ]);
  });
});
