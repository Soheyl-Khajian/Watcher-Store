// مسیر فایل: src/components/cart/add-to-cart-button-card.tsx

'use client';

import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { addToCart } from '@/lib/api/nestjs';
import { toast } from 'sonner';

interface AddToCartButtonCardProps {
  productId: string | number;
  productName: string;
}

export function AddToCartButtonCard({
  productId,
  productName,
}: AddToCartButtonCardProps) {
  const { token, setCart } = useAuthStore();

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // جلوگیری از انتقال به صفحه محصول هنگام کلیک روی دکمه
    e.preventDefault();

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
      onClick={handleAddToCart}
      className="w-full flex items-center justify-center gap-2 cursor-pointer"
    >
      <span>افزودن به سبد خرید</span>
      <ShoppingCart className="h-5 w-5" />
    </Button>
  );
}
