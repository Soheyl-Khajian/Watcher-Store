// frontend/src/components/ui/stock-note.tsx -> "12 in stock", "Only 2
// left" or "Out of stock", in the page's language (lib/stock.ts).

'use client';

import { useT } from '@/i18n/client';
import { cn } from '@/lib/utils';
import { stockLabel, stockLevel } from '@/lib/stock';

const TONE = {
  out: 'text-destructive font-semibold',
  low: 'text-warning font-medium',
  in: 'text-muted-foreground',
} as const;

export function StockNote({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) {
  const t = useT();
  return (
    <p className={cn('text-sm', TONE[stockLevel(stock)], className)}>
      {t.ref(stockLabel(stock))}
    </p>
  );
}
