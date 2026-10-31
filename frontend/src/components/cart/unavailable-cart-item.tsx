// frontend/src/components/cart/unavailable-cart-item.tsx

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UnavailableCartItem({
  onRemove,
  disabled,
}: {
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-center gap-4">
      <div className="flex-grow">
        <p className="text-destructive font-semibold">
          این محصول دیگر در دسترس نیست
        </p>
        <p className="text-muted-foreground text-sm">
          برای ادامه خرید آن را از سبد حذف کنید.
        </p>
      </div>
      <Button
        className="cursor-pointer"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={disabled}
        aria-label="حذف محصول ناموجود"
      >
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}
