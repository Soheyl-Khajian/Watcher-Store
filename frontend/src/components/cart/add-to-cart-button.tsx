'use client';

import { Button } from '@/components/ui/button';
import { addToCart } from '@/lib/api/nestjs';
import { useAuthStore } from '@/lib/store/auth';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  productId: string | number;
  productName: string;
}

export function AddToCartButton({
  productId,
  productName,
}: AddToCartButtonProps) {
  const { token, setCart } = useAuthStore();

  const handleAddToCart = async () => {
    if (!token) {
      toast.error('برای افزودن محصول به سبد خرید، لطفاً ابتدا وارد شوید.');
      return;
    }

    const updatedCart = await addToCart(String(productId), 1, token);

    if (updatedCart) {
      setCart(updatedCart);
      toast.success(`${productName} به سبد خرید اضافه شد.`);
    } else {
      toast.error('خطا در افزودن محصول به سبد خرید.');
    }
  };

  return (
    <Button
      size="lg"
      className="w-full cursor-pointer"
      onClick={handleAddToCart}
    >
      <ShoppingCart className="ml-2 h-5 w-5" />
      افزودن به سبد خرید
    </Button>
  );
}
