// backend/nest-api/src/cart/cart.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
  ) {}

  private async createCartIfMissing(
    cartRepository: Repository<Cart>,
    userId: number,
  ): Promise<void> {
    await cartRepository
      .createQueryBuilder()
      .insert()
      .into(Cart)
      .values({ userId })
      .orIgnore()
      .execute();
  }

  private async getLockedCart(
    manager: EntityManager,
    userId: number,
  ): Promise<Cart> {
    const cartRepository = manager.getRepository(Cart);

    // PostgreSQL resolves concurrent first-cart creation through the existing
    // unique userId index. The losing insert is deliberately ignored.
    await this.createCartIfMissing(cartRepository, userId);

    const cart = await cartRepository.findOne({
      where: { userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!cart) {
      throw new InternalServerErrorException(
        'امکان بارگذاری سبد خرید وجود ندارد.',
      );
    }

    return cart;
  }

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cartItemRepository = manager.getRepository(CartItem);
      const cart = await this.getLockedCart(manager, userId);
      const productId = String(addToCartDto.productId);

      let item = await cartItemRepository.findOne({
        where: {
          cart: {
            id: cart.id,
          },
          productId,
        },
      });

      if (item) {
        item.quantity += addToCartDto.quantity;
      } else {
        item = cartItemRepository.create({
          productId,
          quantity: addToCartDto.quantity,
          cart,
        });
      }

      await cartItemRepository.save(item);

      const updatedCart = await cartRepository.findOne({
        where: { id: cart.id },
        relations: ['items'],
      });

      if (!updatedCart) {
        throw new InternalServerErrorException(
          'امکان بارگذاری سبد خرید وجود ندارد.',
        );
      }

      return updatedCart;
    });
  }

  async getCart(userId: number): Promise<Cart> {
    await this.createCartIfMissing(this.cartRepository, userId);

    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    });

    if (!cart) {
      throw new InternalServerErrorException(
        'امکان بارگذاری سبد خرید وجود ندارد.',
      );
    }

    return cart;
  }

  async removeFromCart(userId: number, productId: string): Promise<Cart> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cartItemRepository = manager.getRepository(CartItem);
      const cart = await this.getLockedCart(manager, userId);

      const itemToRemove = await cartItemRepository.findOne({
        where: {
          cart: {
            id: cart.id,
          },
          productId,
        },
      });

      if (!itemToRemove) {
        throw new NotFoundException('آیتم مورد نظر در سبد خرید یافت نشد.');
      }

      await cartItemRepository.remove(itemToRemove);

      const updatedCart = await cartRepository.findOne({
        where: { id: cart.id },
        relations: ['items'],
      });

      if (!updatedCart) {
        throw new InternalServerErrorException(
          'امکان بارگذاری سبد خرید وجود ندارد.',
        );
      }

      return updatedCart;
    });
  }
}
