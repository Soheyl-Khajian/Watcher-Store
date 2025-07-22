// src/cart/cart.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) //لطفاً ابزار مخصوص کار با جدول کارت رو بمن بده
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
  ) {}

  private async findOrCreateCart(userId: number): Promise<Cart> {
    //تابع کمکی که فقط درون کلاس اجرا میشود
    let cart = await this.cartRepository.findOne({
      //در جدول کارت بگرد و اولین رکوردی را که یوزرآیدی آن با یوزرآیدی ورودی برابر است، برای من پیدا کن
      where: { userId },
      relations: ['items'], //وقتی سبد خرید را پیدا کردی، لطفاً تمام آیتم‌های مرتبط با آن را هم از جدول کارت_آیتم برای من بیاور
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] }); //یک سبد خرید جدید در حافظه می‌سازد
      await this.cartRepository.save(cart); //آن را در دیتابیس ذخیره می‌کند
    }
    return cart;
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<Cart> {
    const cart = await this.findOrCreateCart(userId);

    let item = cart.items.find((i) => i.productId === addToCartDto.productId);

    if (item) {
      item.quantity += addToCartDto.quantity;
    } else {
      item = this.cartItemRepository.create({
        productId: addToCartDto.productId,
        quantity: addToCartDto.quantity,
        cart: cart,
      });
    }

    await this.cartItemRepository.save(item);
    return this.getCart(userId);
  }

  async getCart(userId: number): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      return this.findOrCreateCart(userId);
    }
    return cart;
  }

  async removeFromCart(userId: number, productId: string): Promise<Cart> {
    const cart = await this.getCart(userId);
    const itemToRemove = cart.items.find(
      (item) => item.productId === productId,
    );

    if (!itemToRemove) {
      throw new NotFoundException('آیتم مورد نظر در سبد خرید یافت نشد.');
    }

    await this.cartItemRepository.remove(itemToRemove);
    return this.getCart(userId);
  }
}
