// frontend/src/app/(main)/payment/result/payment-result-client.tsx
//
// Shows the order's status as the server records it, never a status from
// the URL: the API verified the payment with the gateway before sending
// the customer here. When the gateway has not confirmed yet (the order is
// still pending), the page checks again a few times before suggesting the
// customer looks later.

'use client';

import { useFormatter } from '@/i18n/client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { fetchOrderStatus, type OrderStatus } from '@/lib/api/nestjs';
import { useRequireSession } from '@/lib/hooks/use-require-session';

type Outcome = 'loading' | 'paid' | 'failed' | 'pending' | 'unknown';

// A pending order is checked again every 5 seconds, up to 6 times.
const RECHECK_INTERVAL_MS = 5000;
const RECHECKS = 6;

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

export default function PaymentResultClient() {
  const searchParams = useSearchParams();
  const status = useRequireSession();
  const orderId = searchParams.get('orderId');
  const [outcome, setOutcome] = useState<Outcome>('loading');
  const format = useFormatter();
  const [stillChecking, setStillChecking] = useState(false);

  useEffect(() => {
    if (!orderId || !/^\d{1,12}$/.test(orderId)) {
      setOutcome('unknown');
      return;
    }
    if (status !== 'signed-in') return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;

    const check = async () => {
      const result = outcomeFor(await fetchOrderStatus(orderId));
      if (cancelled) return;
      setOutcome(result);

      const again = result === 'pending' && checks < RECHECKS;
      setStillChecking(again);
      if (again) {
        checks += 1;
        timer = setTimeout(check, RECHECK_INTERVAL_MS);
      }
    };
    void check();

    // Leaving the page stops the checks.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, status]);

  if (outcome === 'loading') {
    return (
      <div className="container mx-auto py-24 text-center" role="status">
        در حال بررسی اطلاعات پرداخت...
      </div>
    );
  }

  const number = orderId ? format.digits(Number(orderId)) : '';

  const view = {
    paid: {
      icon: <CheckCircle className="mb-4 h-16 w-16 text-green-500" />,
      title: 'پرداخت موفق',
      text: `پرداخت سفارش شماره ${number} تأیید شد.`,
    },
    failed: {
      icon: <XCircle className="mb-4 h-16 w-16 text-red-500" />,
      title: 'پرداخت ناموفق',
      text: 'پرداخت انجام نشد و سفارش لغو شد.',
    },
    pending: {
      icon: <Clock className="mb-4 h-16 w-16 text-amber-500" />,
      title: 'پرداخت در انتظار تأیید',
      text: stillChecking
        ? 'در حال دریافت تأیید از درگاه پرداخت...'
        : 'هنوز تأییدی از درگاه پرداخت دریافت نشده است. وضعیت سفارش را چند دقیقه بعد در حساب کاربری خود ببینید.',
    },
    unknown: {
      icon: <XCircle className="mb-4 h-16 w-16 text-red-500" />,
      title: 'پرداخت یافت نشد',
      text: 'اطلاعات این پرداخت پیدا نشد.',
    },
  }[outcome];

  return (
    <div
      className="container mx-auto flex flex-col items-center justify-center px-4 py-24 text-center"
      role="status"
      aria-live="polite"
    >
      {view.icon}
      <h1 className="text-2xl font-bold">{view.title}</h1>
      <p className="text-muted-foreground mt-2">{view.text}</p>
      <Link href="/profile" className="text-primary mt-6 underline">
        مشاهده سفارش‌ها
      </Link>
    </div>
  );
}
