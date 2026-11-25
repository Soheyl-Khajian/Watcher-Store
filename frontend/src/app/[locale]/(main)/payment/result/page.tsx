// frontend/src/app/[locale]/(main)/payment/result/page.tsx
//
// Where the customer lands after the payment gateway (via the API's
// callback, which has already verified the payment).

import { getT } from '@/i18n/server';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import PaymentResultClient from './payment-result-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t('payment.title'), robots: { index: false } };
}

export default async function PaymentResultPage() {
  const t = await getT();
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-24 text-center" role="status">
          {t('common.loading')}
        </div>
      }
    >
      <PaymentResultClient />
    </Suspense>
  );
}
