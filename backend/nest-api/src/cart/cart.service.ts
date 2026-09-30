// backend/nest-api/src/cart/cart.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) // gives tools to work with cart table
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
  ) {}

  private async findOrCreateCart(userId: number): Promise<Cart> {
    // utility function which only runs inside the class
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'], // returns all related items in cart_items table
    });

    if (!cart) {
      cart = this.cartRepository.create({ userId, items: [] });
      await this.cartRepository.save(cart);
    }
    return cart;
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<Cart> {
    const cart = await this.findOrCreateCart(userId);
    const productId = String(addToCartDto.productId);

    let item = cart.items.find((item) => item.productId === productId);

    if (item) {
      item.quantity += addToCartDto.quantity;
    } else {
      item = this.cartItemRepository.create({
        productId,
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

  async clearCart(userId: number): Promise<void> {
    const cart = await this.getCart(userId);
    if (cart && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }
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
