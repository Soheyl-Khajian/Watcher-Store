// src/cart/cart.service.ts
import { Injectable } from '@nestjs/common';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  // یک دیتابیس موقت در حافظه برای سبدهای خرید
  // ساختار: { userId: [{ productId, quantity }] }
  private carts: Record<number, AddToCartDto[]> = {};

  // افزودن یا به‌روزرسانی آیتم در سبد خرید
  addToCart(userId: number, addToCartDto: AddToCartDto): AddToCartDto[] {
    // اگر کاربر هنوز سبد خریدی ندارد، یک سبد خالی برایش بساز
    if (!this.carts[userId]) {
      this.carts[userId] = [];
    }

    const cart = this.carts[userId];
    const itemIndex = cart.findIndex(
      (item) => item.productId === addToCartDto.productId,
    );

    if (itemIndex > -1) {
      // اگر محصول از قبل در سبد وجود دارد، تعداد آن را به‌روز کن
      cart[itemIndex].quantity += addToCartDto.quantity;
    } else {
      // در غیر این صورت، محصول جدید را به سبد اضافه کن
      cart.push(addToCartDto);
    }

    return cart;
  }

  // مشاهده سبد خرید یک کاربر
  getCart(userId: number): AddToCartDto[] {
    return this.carts[userId] || [];
  }

  // حذف یک آیتم از سبد خرید
  removeFromCart(userId: number, productId: string): AddToCartDto[] {
    const cart = this.carts[userId];
    if (!cart) {
      return [];
    }

    this.carts[userId] = cart.filter((item) => item.productId !== productId);
    return this.carts[userId];
  }
}
