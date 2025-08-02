// مسیر فایل: backend/payload-cms/src/endpoints/productsByCategory.ts

import type { Endpoint } from 'payload'
import type { PayloadRequest } from 'payload'
import type { Category } from '../payload-types'

// تابع بازگشتی برای پیدا کردن تمام ID های فرزندان
const findAllDescendantIds = (allCategories: Category[], parentId: number): number[] => {
  const children = allCategories.filter((cat) => {
    const pID = typeof cat.parent === 'object' ? cat.parent?.id : cat.parent
    return pID === parentId
  })

  let ids: number[] = children.map((cat) => cat.id)

  children.forEach((child) => {
    ids = [...ids, ...findAllDescendantIds(allCategories, child.id)]
  })
  return ids
}

export const productsByCategoryEndpoint: Endpoint = {
  path: '/products-by-category/:slug',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    // بررسی وجود پارامتر slug و تایپ‌بندی صحیح آن
    if (!req.routeParams?.slug) {
      return Response.json({ message: 'Slug parameter is missing' }, { status: 400 })
    }
    const slug = req.routeParams.slug as string

    try {
      // پیدا کردن دسته مادر بر اساس اسلاگ
      const { docs: parentCategories } = await req.payload.find({
        collection: 'categories',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
      })

      if (!parentCategories || parentCategories.length === 0) {
        return Response.json({ message: 'Category not found' }, { status: 404 })
      }

      const parentCategory = parentCategories[0]

      // دریافت همه دسته‌بندی‌ها برای ساخت درخت
      const { docs: allCategories } = await req.payload.find({
        collection: 'categories',
        limit: 1000,
        depth: 0,
      })

      // جمع‌آوری ID های خود دسته و تمام فرزندانش
      const descendantIds = findAllDescendantIds(allCategories, parentCategory.id)
      const allCategoryIds = [parentCategory.id, ...descendantIds]

      // پیدا کردن تمام محصولات مرتبط با این شناسه‌ها
      const { docs: products } = await req.payload.find({
        collection: 'products',
        where: {
          categories: {
            in: allCategoryIds,
          },
        },
        limit: 100,
      })

      return Response.json({ category: parentCategory, products: products })
    } catch (error) {
      console.error(error)
      return Response.json({ message: 'Error fetching products' }, { status: 500 })
    }
  },
}
