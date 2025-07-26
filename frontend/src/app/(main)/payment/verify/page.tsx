// src/app/(main)/payment/verify/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { verifyPayment } from '@/lib/api/nestjs';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuthStore();
  const [message, setMessage] = useState('در حال بررسی اطلاعات پرداخت...');
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    if (orderId && status && token) {
      const processVerification = async () => {
        const result = await verifyPayment(orderId, status, token);
        if (result) {
          setMessage(result.message);
          setIsSuccess(status === 'success');

          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setMessage('خطا در تأیید پرداخت.');
          setIsSuccess(false);
        }
      };
      processVerification();
    }
  }, [searchParams, token]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center text-center py-24">
      {isSuccess === null ? (
        <p>{message}</p>
      ) : isSuccess ? (
        <>
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold">پرداخت موفق</h1>
          <p className="text-muted-foreground mt-2">{message}</p>
        </>
      ) : (
        <>
          <XCircle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold">پرداخت ناموفق</h1>
          <p className="text-muted-foreground mt-2">{message}</p>
        </>
      )}
    </div>
  );
}
