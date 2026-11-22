// frontend/src/components/cart/quantity-control.tsx
//
// − [n] + for a cart line. The server checks stock; when it refuses, the
// customer sees its message. Lowering below one is the remove button's job.

'use client';

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuantityControl({
  quantity,
  productName,
  busy,
  onChange,
}: {
  quantity: number;
  productName: string;
  busy: boolean;
  onChange: (quantity: number) => void;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={`تعداد ${productName}`}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label={`یکی بیشتر از ${productName}`}
        disabled={busy}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </Button>
      <span className="min-w-8 text-center tabular-nums" aria-live="polite">
        {quantity.toLocaleString('fa-IR')}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label={`یکی کمتر از ${productName}`}
        disabled={busy || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}
