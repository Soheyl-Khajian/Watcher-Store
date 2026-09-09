import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        project: [
          join(__dirname, 'frontend/tsconfig.json'),
          join(__dirname, 'backend/payload-cms/tsconfig.json'),
          join(__dirname, 'backend/nest-api/tsconfig.json'),
        ],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/cache/**',
      '**/payload-types.ts',
      '**/importMap.js',
    ],
  },
);