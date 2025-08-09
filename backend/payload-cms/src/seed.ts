// مسیر فایل: backend/payload-cms/src/seed.ts
import { getPayload } from 'payload'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

import configPromise from './payload.config'
import type { Payload } from 'payload'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, '../../.env') })

// ۱. اینترفیس را برای شامل شدن آیکون به‌روز می‌کنیم
interface SeedCategory {
  name: string
  slug: string
  parentSlug: string | null
  icon?: string // <-- فیلد آیکون اضافه و اختیاری شد
}

const upsertDoc = async (payload: Payload, collection: 'categories', query: any, data: any) => {
  const { docs } = await payload.find({ collection, where: query, limit: 1 })
  if (docs.length > 0) {
    console.log(
      `ℹ️ سند در کالکشن '${collection}' با کوئری ${JSON.stringify(query)} از قبل وجود دارد. رد می‌شویم.`,
    )
    return docs[0]
  }
  console.log(`در حال ساخت سند جدید در کالکشن '${collection}'...`)
  const newDoc = await payload.create({ collection, data })
  console.log(`✅ سند جدید با موفقیت ساخته شد.`)
  return newDoc
}

const seed = async () => {
  console.log('در حال آماده‌سازی Payload برای Seeding...')
  const payload = await getPayload({
    config: await configPromise,
  })
  console.log('Payload آماده است. شروع فرآیند Seeding...')

  try {
    const categoriesData: SeedCategory[] = JSON.parse(
      await fs.readFile(path.resolve(__dirname, '../seed-categories.json'), 'utf-8'),
    )
    const slugToIdMap = new Map()
    let remainingCategories = [...categoriesData]
    let progressMade = true

    console.log('\nدر حال پردازش سلسله‌مراتبی دسته‌بندی‌ها...')

    while (remainingCategories.length > 0 && progressMade) {
      progressMade = false
      const nextRemaining: SeedCategory[] = []

      for (const cat of remainingCategories) {
        if (!cat.parentSlug) {
          // ۲. فیلد icon به داده‌ها اضافه شد
          const newCat = await upsertDoc(
            payload,
            'categories',
            { slug: { equals: cat.slug } },
            { name: cat.name, slug: cat.slug, icon: cat.icon },
          )
          slugToIdMap.set(newCat.slug, newCat.id)
          progressMade = true
        } else {
          const parentId = slugToIdMap.get(cat.parentSlug)
          if (parentId) {
            // ۳. فیلد icon به داده‌ها اضافه شد
            const newCat = await upsertDoc(
              payload,
              'categories',
              { slug: { equals: cat.slug } },
              { name: cat.name, slug: cat.slug, parent: parentId, icon: cat.icon },
            )
            slugToIdMap.set(newCat.slug, newCat.id)
            progressMade = true
          } else {
            nextRemaining.push(cat)
          }
        }
      }
      remainingCategories = nextRemaining
    }

    if (remainingCategories.length > 0) {
      remainingCategories.forEach((cat) =>
        console.warn(`⚠️ والد با اسلاگ '${cat.parentSlug}' برای دسته '${cat.name}' هرگز یافت نشد.`),
      )
    }
  } catch (error) {
    console.error('❌ خطا در ورود دسته‌بندی‌ها:', error)
  }

  try {
    console.log('\nدر حال به‌روزرسانی اطلاعات فوتر...')
    const footerData = JSON.parse(
      await fs.readFile(path.resolve(__dirname, '../seed-footer.json'), 'utf-8'),
    )
    await payload.updateGlobal({
      slug: 'footer',
      data: footerData,
    })
    console.log('✅ اطلاعات فوتر با موفقیت به‌روز شد.')
  } catch (error) {
    console.error('❌ خطا در ورود اطلاعات فوتر:', error)
  }

  console.log('\nفرآیند Seeding به پایان رسید.')
  process.exit(0)
}

seed()
