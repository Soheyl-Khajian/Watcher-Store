import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// The two Next.js apps in this workspace. Next.js rules need each app's root
// to resolve its pages and public directory.
const nextApps = ['frontend', 'backend/payload-cms'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/cache/**',
      '**/coverage/**',
      // Generated files.
      '**/next-env.d.ts',
      '**/payload-types.ts',
      '**/importMap.js',
      // Local tool state, including git worktrees: full copies of this repo
      // that must not be linted as part of it.
      '.claude/**',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // Anchor typescript-eslint to this repository root instead of letting it
  // infer one, which fails when another copy of the repo is nested inside.
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },

  {
    rules: {
      // Allow intentionally unused values when they are prefixed with "_".
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Logging goes through console.error/warn on purpose; anything else
      // should be removed before it ships.
      'no-console': 'warn',
    },
  },

  // Server-side code and tooling run on Node.js.
  {
    files: [
      'backend/**/*.{ts,tsx,js,mjs,cjs}',
      'scripts/**/*.{js,mjs,cjs}',
      '*.{js,mjs,cjs}',
      '**/*.config.{js,mjs,cjs,ts}',
    ],
    languageOptions: { globals: { ...globals.node } },
  },

  // Both Next.js apps render in the browser and on the server.
  {
    files: nextApps.map((app) => `${app}/src/**/*.{ts,tsx}`),
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: { next: { rootDir: nextApps } },
  },

  // Payload generates migrations with a fixed signature, and command-line
  // scripts report progress on the console.
  {
    files: ['backend/payload-cms/src/migrations/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: [
      'backend/payload-cms/src/seed.ts',
      'backend/nest-api/src/database/*.cli.ts',
      'scripts/**/*.{js,mjs}',
    ],
    rules: { 'no-console': 'off' },
  },

  // Must stay last: turns off stylistic rules that Prettier owns.
  prettier,
);
