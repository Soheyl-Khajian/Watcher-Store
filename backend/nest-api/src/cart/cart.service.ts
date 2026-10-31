// backend/nest-api/src/cart/cart.service.ts

import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
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
    // Validate the product before taking the cart lock so the lock is not held
    // across an HTTP call to Payload. Stock is checked again at order creation
    // and at payment, so a race here cannot oversell.
    const product = await this.productsService.findOne(addToCartDto.productId);
    this.productsService.getCurrentPrice(product);
    const availableStock = this.productsService.getAvailableStock(product);

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

      const requestedQuantity = (item?.quantity ?? 0) + addToCartDto.quantity;

      if (requestedQuantity > availableStock) {
        throw new ConflictException(
          availableStock === 0
            ? 'این محصول در حال حاضر موجود نیست.'
            : `حداکثر ${availableStock} عدد از این محصول قابل سفارش است.`,
        );
      }

      if (item) {
        item.quantity = requestedQuantity;
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
