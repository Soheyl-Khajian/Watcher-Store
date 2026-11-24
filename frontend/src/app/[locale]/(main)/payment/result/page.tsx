// frontend/src/app/(main)/payment/result/page.tsx
//
// Where the customer lands after the payment gateway (via the API's
// callback, which has already verified the payment).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import PaymentResultClient from './payment-result-client';

export const metadata: Metadata = {
  title: 'نتیجه پرداخت',
  robots: { index: false },
};

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-24 text-center" role="status">
          در حال بارگذاری...
        </div>
      }
    >
      <PaymentResultClient />
    </Suspense>
  );
}
