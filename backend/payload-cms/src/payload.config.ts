// backend/payload-cms/src/payload.config.ts
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../../../.env') });

import { env } from './env';

import { postgresAdapter } from '@payloadcms/db-postgres';
import { slateEditor } from '@payloadcms/richtext-slate';
import path from 'path';
import { buildConfig } from 'payload';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Categories } from './collections/Categories';
import { Products } from './collections/Products';
import { Posts } from './collections/Posts';
import { Pages } from './collections/Pages';
import { Footer } from './globals/Footer';
import { productsByCategoryEndpoint } from './endpoints/productsByCategory';

import { en } from '@payloadcms/translations/languages/en';
import { fa } from '@payloadcms/translations/languages/fa';

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(__dirname),
    },
    components: {
      afterNavLinks: ['/components/OrdersNavLink'],
      views: {
        orders: {
          Component: '/views/OrdersView',
          path: '/orders',
          exact: true,
        },
      },
    },
  },
  i18n: {
    supportedLanguages: { en, fa },
  },
  collections: [Users, Categories, Products, Posts, Pages, Media],
  globals: [Footer],
  endpoints: [productsByCategoryEndpoint],
  editor: slateEditor({}),
  secret: env.PAYLOAD_SECRET,
  serverURL: env.PAYLOAD_PUBLIC_URL,
  // Cookie-authenticated requests are honoured only from the CMS itself.
  // The storefront does not use Payload's session cookie, so it is not
  // trusted: a script injected into the shop could otherwise act with an
  // administrator's session.
  csrf: [env.PAYLOAD_PUBLIC_URL],
  // Nothing uses GraphQL; the REST API covers the storefront and admin.
  graphQL: {
    disable: true,
  },
  // Product photos stay well under this; it stops oversized uploads before
  // they are processed or stored.
  upload: {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    abortOnLimit: true,
  },
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
    // Generated only by `pnpm --filter payload-cms generate:types` (which
    // also formats it), not on every dev-server start, so starting the CMS
    // never leaves an unformatted, modified file behind.
    autoGenerate: false,
  },
  cors: [env.FRONTEND_URL],
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URI,
    },
    schemaName: env.PAYLOAD_SCHEMA,
    push: false,
  }),
  sharp,
  plugins: [
    // TODO: add S3/R2 storage adapter for production media persistence
  ],
});
