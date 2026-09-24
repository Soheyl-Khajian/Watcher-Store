// backend/payload-cms/src/components/ApplyPriceChangeButton.tsx

'use client';

import React, { useState } from 'react';
import { Button, useAuth, useDocumentInfo } from '@payloadcms/ui';

type AdjustmentAction = 'apply' | 'clear';

type OperationResult = {
  success?: boolean;
  message?: string;
  matchedProducts?: number;
  updatedProducts?: number;
  unchangedProducts?: number;
};

const ApplyPriceChangeButton: React.FC = () => {
  const [pendingAction, setPendingAction] = useState<AdjustmentAction | null>(
    null,
  );
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const { id: categoryId } = useDocumentInfo();
  const { user } = useAuth();

  const runAdjustment = async (action: AdjustmentAction) => {
    if (!categoryId) {
      setMessage({
        text: 'ID دسته‌بندی یافت نشد.',
        type: 'error',
      });
      return;
    }

    if (
      action === 'clear' &&
      !window.confirm(
        'آیا از حذف تغییر قیمت این دسته و زیردسته‌های آن مطمئن هستید؟',
      )
    ) {
      return;
    }

    setPendingAction(action);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/categories/${categoryId}/apply-price-adjustment`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
          },
          body: JSON.stringify({ action }),
        },
      );

      const result = (await response.json()) as OperationResult;

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'عملیات ناموفق بود.');
      }

      setMessage({
        type: 'success',
        text: `${result.message} تعداد منطبق: ${
          result.matchedProducts ?? 0
        }، به‌روزشده: ${result.updatedProducts ?? 0}، بدون تغییر: ${
          result.unchangedProducts ?? 0
        }.`,
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'یک خطای پیش‌بینی نشده رخ داد.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div>
      <p className="px-0 py-2.5 text-sm text-gray-700 dark:text-gray-400">
        پس از ذخیره تنظیمات، تغییر قیمت را روی محصولات این دسته و زیردسته‌های آن
        اعمال کنید.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => runAdjustment('apply')}
          disabled={pendingAction !== null}
        >
          {pendingAction === 'apply' ? 'در حال اعمال...' : 'اعمال تغییر قیمت'}
        </Button>

        <Button
          buttonStyle="secondary"
          onClick={() => runAdjustment('clear')}
          disabled={pendingAction !== null}
        >
          {pendingAction === 'clear' ? 'در حال حذف...' : 'حذف تغییر قیمت'}
        </Button>
      </div>

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
  );
};

export default ApplyPriceChangeButton;
