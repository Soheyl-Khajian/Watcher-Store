// frontend/src/components/cart/quantity-control.tsx
//
// − [n] + for a cart line. + stops at the stock shown on the line; the
// server checks again, and when it refuses the customer sees its message.
// Lowering below one is the remove button's job.

'use client';

import { useFormatter, useT } from '@/i18n/client';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuantityControl({
  quantity,
  productName,
  max,
  busy,
  onChange,
}: {
  quantity: number;
  productName: string;
  // Units in stock: + is disabled at this count.
  max: number;
  busy: boolean;
  onChange: (quantity: number) => void;
}) {
  const format = useFormatter();
  const t = useT();
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t.plain('cart.quantityOf', { name: productName })}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label={t.plain('cart.increase', { name: productName })}
        disabled={busy || quantity >= max}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </Button>
      <span className="min-w-8 text-center tabular-nums" aria-live="polite">
        {format.number(quantity)}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        aria-label={t.plain('cart.decrease', { name: productName })}
        disabled={busy || quantity <= 1}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
      </Button>
    </div>
  );
}
