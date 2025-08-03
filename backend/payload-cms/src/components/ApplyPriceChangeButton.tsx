// مسیر فایل: backend/payload-cms/src/components/ApplyPriceChangeButton.tsx

'use client'

import React, { useState } from 'react'
import { Button, useAuth, useDocumentInfo } from '@payloadcms/ui'

const ApplyPriceChangeButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  // ۱. state جدید برای نگهداری پیام
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const { id: categoryId } = useDocumentInfo()
  const { user } = useAuth()

  const handleClick = async () => {
    setIsLoading(true)
    setMessage(null) // پاک کردن پیام قبلی در هر بار کلیک

    if (!categoryId) {
      setMessage({ text: 'ID دسته‌بندی یافت نشد.', type: 'error' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/categories/${categoryId}/apply-price-adjustment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // ۲. تنظیم پیام موفقیت‌آمیز به جای toast
        setMessage({
          text: result.message || 'عملیات با موفقیت انجام شد.',
          type: 'success',
        })
      } else {
        throw new Error(result.message || 'خطایی رخ داد.')
      }
    } catch (error) {
      let errorMessage = 'یک خطای پیش‌بینی نشده رخ داد.'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      // ۳. تنظیم پیام خطا به جای toast
      setMessage({ text: errorMessage, type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <p className="py-2.5 px-0 text-sm text-gray-700 dark:text-gray-400">
        پس از تنظیم درصد تخفیف یا افزایش، روی این دکمه کلیک کنید تا تغییرات بر روی تمام محصولات این
        دسته و زیردسته‌های آن اعمال شود.
      </p>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'در حال اعمال...' : 'اعمال تغییر قیمت'}
      </Button>

      {/* ۴. نمایش پیام در زیر دکمه */}
      {message && (
        <p
          className={`mt-2 text-sm ${
            message.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

export default ApplyPriceChangeButton
