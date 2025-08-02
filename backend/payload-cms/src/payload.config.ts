// payload-cms/payload.config.ts
import { config } from 'dotenv'
config({ path: '../.env' }) // ← بارگذاری فایل ریشه

import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { slateEditor } from '@payloadcms/richtext-slate'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Posts } from './collections/Posts'
import { productsByCategoryEndpoint } from './endpoints/productsByCategory'

import { en } from '@payloadcms/translations/languages/en'
import { fa } from '@payloadcms/translations/languages/fa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  collections: [Users, Categories, Products, Posts, Media],
  endpoints: [productsByCategoryEndpoint],
  editor: slateEditor({}),
  secret: process.env.PAYLOAD_SECRET!,
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
  cors: ['http://localhost:3002'],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI!, // از متغیر مرکزی
    },
    schemaName: process.env.PAYLOAD_SCHEMA,
    push: false, //غیرفعال کردن بروزرسانی خودکار پایگاه داده
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
