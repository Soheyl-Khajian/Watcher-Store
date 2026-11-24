// frontend/src/components/ui/stock-note.tsx -> "۱۲ عدد در انبار",
// "فقط ۲ عدد ... باقی مانده" or "ناموجود" (lib/stock.ts).

import { cn } from '@/lib/utils';
import { stockLabel, stockLevel } from '@/lib/stock';

const TONE = {
  out: 'text-destructive font-semibold',
  low: 'text-amber-600 dark:text-amber-400 font-medium',
  in: 'text-muted-foreground',
} as const;

export function StockNote({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) {
  return (
    <p className={cn('text-sm', TONE[stockLevel(stock)], className)}>
      {stockLabel(stock)}
    </p>
  );
}
