// frontend/src/components/cart/unavailable-cart-item.tsx

'use client';

import { useT } from '@/i18n/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UnavailableCartItem({
  onRemove,
  disabled,
}: {
  onRemove: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <li className="flex items-center gap-4">
      <div className="flex-grow">
        <p className="text-destructive font-semibold">
          {t('cart.unavailableTitle')}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('cart.unavailableText')}
        </p>
      </div>
      <Button
        className="cursor-pointer"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label={t('cart.removeUnavailable')}
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
