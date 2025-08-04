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
    if (!adjustmentType || typeof adjustmentValue === 'undefined' || adjustmentValue === null) {
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
      depth: 1, // depth: 1 for having access to full product data
    })

    if (productsToUpdate.length === 0) {
      return Response.json({
        success: true,
        message: 'هیچ محصولی برای به‌روزرسانی یافت نشد.',
      })
    }

    const updatePromises = productsToUpdate.map((product: Product) => {
      let dataToUpdate: Partial<Product> = {}

      if (adjustmentType === 'discount' && adjustmentValue > 0) {
        const newSalePrice = Math.round(product.price * (1 - adjustmentValue / 100))
        dataToUpdate = {
          salePrice: newSalePrice,
          isOnSale: true,
        }
      } else if (adjustmentType === 'increase') {
        const newPrice = Math.round(product.price * (1 + adjustmentValue / 100))
        dataToUpdate = {
          price: newPrice,
          salePrice: null,
          isOnSale: false,
        }
      } else {
        // This case handles canceling a sale (adjustmentValue is 0)
        dataToUpdate = {
          salePrice: null,
          isOnSale: false,
        }
      }

      return req.payload.update({
        collection: 'products',
        id: product.id,
        data: dataToUpdate,
      })
    })

    await Promise.all(updatePromises)

    const messageAction = adjustmentValue <= 0 ? 'لغو شد' : 'اعمال شد'
    return Response.json({
      success: true,
      message: `فروش ویژه برای ${productsToUpdate.length} محصول با موفقیت ${messageAction}.`,
    })
  } catch (error) {
    let message = 'An error occurred during the price update.'
    if (error instanceof Error) {
      message = error.message
      if (error.name === 'ValidationError') {
        console.error(JSON.stringify(error, null, 2))
      }
    } else {
      console.error(error)
    }

    return Response.json({ message }, { status: 500 })
  }
}
