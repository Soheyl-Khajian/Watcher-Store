// frontend/src/app/(main)/payment/verify/payment-verify-client.tsx
//
// Where the customer lands after the payment gateway. The API has already
// verified the payment with the gateway; this page only shows the order's
// status as the server records it, never a status from the URL.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { fetchOrderStatus, type OrderStatus } from '@/lib/api/nestjs';

type Outcome = 'loading' | 'paid' | 'failed' | 'pending' | 'unknown';

function outcomeFor(status: OrderStatus | null): Outcome {
  switch (status) {
    case 'processing':
    case 'shipped':
    case 'completed':
      return 'paid';
    case 'cancelled':
      return 'failed';
    case 'pending':
      return 'pending';
    default:
      return 'unknown';
  }
}

export default function PaymentVerifyClient() {
  const searchParams = useSearchParams();
  const { token } = useAuthStore();
  const orderId = searchParams.get('orderId');
  const [outcome, setOutcome] = useState<Outcome>('loading');

  useEffect(() => {
    if (!orderId) {
      setOutcome('unknown');
      return;
    }
    if (!token) return;

    let cancelled = false;
    fetchOrderStatus(orderId, token).then((status) => {
      if (!cancelled) setOutcome(outcomeFor(status));
    });
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  if (outcome === 'loading') {
    return (
      <div className="container mx-auto py-24 text-center" role="status">
        در حال بررسی اطلاعات پرداخت...
      </div>
    );
  }

  const view = {
    paid: {
      icon: <CheckCircle className="mb-4 h-16 w-16 text-green-500" />,
      title: 'پرداخت موفق',
      text: `پرداخت سفارش شماره ${orderId} تأیید شد.`,
    },
    failed: {
      icon: <XCircle className="mb-4 h-16 w-16 text-red-500" />,
      title: 'پرداخت ناموفق',
      text: 'پرداخت انجام نشد و سفارش لغو شد.',
    },
    pending: {
      icon: <Clock className="mb-4 h-16 w-16 text-amber-500" />,
      title: 'پرداخت در انتظار تأیید',
      text: 'هنوز تأییدی از درگاه پرداخت دریافت نشده است. وضعیت سفارش را چند دقیقه بعد در حساب کاربری خود ببینید.',
    },
    unknown: {
      icon: <XCircle className="mb-4 h-16 w-16 text-red-500" />,
      title: 'پرداخت یافت نشد',
      text: 'اطلاعات این پرداخت پیدا نشد.',
    },
  }[outcome];

  return (
    <div className="container mx-auto flex flex-col items-center justify-center py-24 text-center">
      {view.icon}
      <h1 className="text-2xl font-bold">{view.title}</h1>
      <p className="text-muted-foreground mt-2">{view.text}</p>
      <Link href="/profile" className="text-primary mt-6 underline">
        مشاهده سفارش‌ها
      </Link>
    </div>
  );
}
