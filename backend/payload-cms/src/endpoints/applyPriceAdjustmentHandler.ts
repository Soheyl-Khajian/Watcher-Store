// مسیر فایل: backend/payload-cms/src/endpoints/applyPriceAdjustmentHandler.ts

import type { PayloadRequest } from 'payload'
import type { Category, Product } from '../payload-types'

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

export const applyPriceAdjustmentHandler = async (req: PayloadRequest) => {
  const categoryId = (req as any).routeParams?.id
  if (!categoryId) {
    return Response.json({ message: 'Category ID is missing' }, { status: 400 })
  }

  const categoryIdAsNumber = parseInt(categoryId, 10)
  if (isNaN(categoryIdAsNumber)) {
    return Response.json({ message: 'Invalid Category ID' }, { status: 400 })
  }

  try {
    const category = await req.payload.findByID({
      collection: 'categories',
      id: categoryIdAsNumber,
    })
    if (!category) {
      return Response.json({ message: 'Category not found' }, { status: 404 })
    }
    const { adjustmentType, adjustmentValue } = category.priceAdjustment || {}
    if (!adjustmentType || typeof adjustmentValue !== 'number') {
      return Response.json(
        { message: 'Price adjustment settings are not configured.' },
        { status: 400 },
      )
    }

    const { docs: allCategories } = await req.payload.find({
      collection: 'categories',
      limit: 1000,
      depth: 0,
    })

    const descendantIds = findAllDescendantIds(allCategories, category.id)
    const allCategoryIds = [category.id, ...descendantIds]

    const { docs: productsToUpdate } = await req.payload.find({
      collection: 'products',
      where: {
        categories: { in: allCategoryIds },
      },
      limit: 1000,
      depth: 1,
    })

    if (productsToUpdate.length === 0) {
      return Response.json({
        success: true,
        message: 'هیچ محصولی برای به‌روزرسانی یافت نشد.',
      })
    }

    const updatePromises = productsToUpdate.map((product: Product) => {
      let newPrice = product.price

      if (adjustmentType === 'discount') {
        newPrice = product.price * (1 - adjustmentValue / 100)
      } else if (adjustmentType === 'increase') {
        newPrice = product.price * (1 + adjustmentValue / 100)
      }
      newPrice = Math.round(newPrice)

      return req.payload.update({
        collection: 'products',
        id: product.id,
        data: {
          price: newPrice,
          gallery: product.gallery,
        },
      })
    })

    await Promise.all(updatePromises)

    return Response.json({
      success: true,
      message: `قیمت ${productsToUpdate.length} محصول با موفقیت به‌روز شد.`,
    })
  } catch (error) {
    // START: Error handling fix
    let message = 'An error occurred during the price update.'

    // Check if the caught object is an instance of Error
    if (error instanceof Error) {
      message = error.message

      // Log more details for validation errors
      if (error.name === 'ValidationError') {
        console.error(JSON.stringify(error, null, 2))
      }
    } else {
      console.error(error)
    }

    return Response.json({ message }, { status: 500 })
    // END: Error handling fix
  }
}
