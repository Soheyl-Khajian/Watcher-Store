// backend/payload-cms/src/components/ApplyPriceChangeButton.tsx
//
// The category's "apply / clear price change" buttons. They call
// POST <api>/categories/:id/apply-price-adjustment and report what
// happened, including the products the tool left alone and why.

'use client';

import React, { useState } from 'react';
import { Button, useConfig, useDocumentInfo } from '@payloadcms/ui';
import type { SkipReason } from '../endpoints/applyPriceAdjustmentHandler';

type AdjustmentAction = 'apply' | 'clear';

type OperationResult = {
  success?: boolean;
  message?: string;
  matchedProducts?: number;
  updatedProducts?: number;
  unchangedProducts?: number;
  skippedProducts?: Array<{ id: number; name: string; reason: SkipReason }>;
};

const SKIP_REASONS: Record<SkipReason, string> = {
  manual_sale: 'قیمت ویژه دستی دارد و دست‌نخورده ماند',
  no_discount: 'با این درصد، قیمت تخفیف‌خورده معتبر نمی‌شود',
  too_expensive: 'قیمت افزایش‌یافته از سقف مجاز بیشتر می‌شود',
  sale_above_price:
    'قیمت ویژه دستی‌اش از قیمت اصلی بیشتر می‌شود؛ اول آن را اصلاح کنید',
};

const CONFIRM: Record<AdjustmentAction, string> = {
  apply:
    'تغییر قیمت روی همه محصولات این دسته و زیردسته‌هایش اعمال شود؟ محصولاتی که قیمت ویژه دستی دارند دست‌نخورده می‌مانند.',
  clear:
    'تغییر قیمت این دسته و زیردسته‌هایش برداشته شود؟ فقط تغییراتی که این ابزار داده برمی‌گردد؛ قیمت‌های ویژه دستی می‌مانند.',
};

const digits = new Intl.NumberFormat('fa-IR');

function summary(result: OperationResult): string {
  return `منطبق: ${digits.format(result.matchedProducts ?? 0)}، به‌روزشده: ${digits.format(
    result.updatedProducts ?? 0,
  )}، بدون تغییر: ${digits.format(result.unchangedProducts ?? 0)}، کنارگذاشته: ${digits.format(
    result.skippedProducts?.length ?? 0,
  )}.`;
}

const ApplyPriceChangeButton: React.FC = () => {
  const [pendingAction, setPendingAction] = useState<AdjustmentAction | null>(
    null,
  );
  const [result, setResult] = useState<
    | { type: 'success'; data: OperationResult }
    | { type: 'error'; text: string }
    | null
  >(null);

  const { id: categoryId } = useDocumentInfo();
  const {
    config: {
      routes: { api },
    },
  } = useConfig();

  const runAdjustment = async (action: AdjustmentAction) => {
    if (!categoryId) {
      setResult({ type: 'error', text: 'ابتدا دسته‌بندی را ذخیره کنید.' });
      return;
    }

    if (!window.confirm(CONFIRM[action])) {
      return;
    }

    setPendingAction(action);
    setResult(null);

    try {
      // The admin's session cookie authenticates the request.
      const response = await fetch(
        `${api}/categories/${categoryId}/apply-price-adjustment`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        },
      );

      const data = (await response.json().catch(() => ({}))) as OperationResult;

      if (!response.ok || !data.success) {
        setResult({
          type: 'error',
          text:
            response.status === 400
              ? 'تنظیمات تغییر قیمت معتبر نیست: نوع و درصد را بررسی و ذخیره کنید.'
              : 'تغییر قیمت انجام نشد و هیچ قیمتی عوض نشد.',
        });
        return;
      }

      setResult({ type: 'success', data });
    } catch {
      setResult({
        type: 'error',
        text: 'ارتباط با سرور برقرار نشد. هیچ قیمتی عوض نشد.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div>
      <p style={{ margin: '0.5rem 0', opacity: 0.8 }}>
        پس از ذخیره تنظیمات، تغییر قیمت را روی محصولات این دسته و زیردسته‌های آن
        اعمال کنید.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
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

      {result?.type === 'error' && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {result.text}
        </p>
      )}

      {result?.type === 'success' && (
        <div role="status">
          <p style={{ color: 'var(--theme-success-500)' }}>
            {summary(result.data)}
          </p>
          {(result.data.skippedProducts?.length ?? 0) > 0 && (
            <ul style={{ margin: 0, paddingInlineStart: '1.25rem' }}>
              {result.data.skippedProducts!.map((product) => (
                <li key={product.id}>
                  <bdi>{product.name}</bdi>: {SKIP_REASONS[product.reason]}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ApplyPriceChangeButton;
