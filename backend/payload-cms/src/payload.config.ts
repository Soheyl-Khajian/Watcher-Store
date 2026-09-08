// backend/payload-cms/src/payload.config.ts
import { config } from 'dotenv'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '../../../.env') })

import { env } from './env'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { slateEditor } from '@payloadcms/richtext-slate'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Posts } from './collections/Posts'
import { Pages } from './collections/Pages'
import { Footer } from './globals/Footer'
import { productsByCategoryEndpoint } from './endpoints/productsByCategory'

import { en } from '@payloadcms/translations/languages/en'
import { fa } from '@payloadcms/translations/languages/fa'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(__dirname),
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
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
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
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
