// frontend/src/app/(main)/payment/verify/page.tsx
'use client';

import { Suspense } from 'react';
import PaymentVerifyClient from './payment-verify-client';

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<div>در حال بارگذاری...</div>}>
      <PaymentVerifyClient />
    </Suspense>
  );
}
