// backend/nest-api/src/orders/orders.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

type PaymentResultOrderStatus = OrderStatus.PROCESSING | OrderStatus.CANCELLED;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async createOrder(userId: number): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const cartRepository = manager.getRepository(Cart);
      const cartItemRepository = manager.getRepository(CartItem);
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      // Serialize checkout attempts for this user's cart. Cart items must be
      // loaded only after this lock has been acquired.
      const cart = await cartRepository.findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cart) {
        throw new BadRequestException('سبد خرید شما خالی است.');
      }

      const cartItems = await cartItemRepository.find({
        where: {
          cart: {
            id: cart.id,
          },
        },
        order: {
          id: 'ASC',
        },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('سبد خرید شما خالی است.');
      }

      const orderItems: OrderItem[] = [];
      let total = 0;

      for (const item of cartItems) {
        const product = await this.productsService.findOne(item.productId);
        const currentPrice = this.productsService.getCurrentPrice(product);

        const orderItem = orderItemRepository.create({
          productId: item.productId,
          quantity: item.quantity,
          price: currentPrice,
        });

        orderItems.push(orderItem);
        total += currentPrice * item.quantity;
      }

      const order = orderRepository.create({
        userId,
        items: orderItems,
        total,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await orderRepository.save(order);

      // This deletion and the order insert commit or roll back together.
      await cartItemRepository.remove(cartItems);

      return savedOrder;
    });
  }

  async findOne(id: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
    }

    return order;
  }

  async findPendingOrderForPayment(id: number, userId: number): Promise<Order> {
    const order = await this.findOne(id, userId);

    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('این سفارش در وضعیت قابل پرداخت نیست.');
    }

    return order;
  }

  async transitionPendingOrderAfterPayment(
    id: number,
    userId: number,
    nextStatus: PaymentResultOrderStatus,
  ): Promise<Order> {
    const result = await this.orderRepository.update(
      {
        id,
        userId,
        status: OrderStatus.PENDING,
      },
      {
        status: nextStatus,
      },
    );

    if (result.affected === 1) {
      return this.findOne(id, userId);
    }

    // Distinguish an inaccessible/nonexistent order from an invalid state
    // without revealing another user's order.
    await this.findOne(id, userId);

    throw new ConflictException(
      'این سفارش قبلاً پردازش شده یا دیگر قابل پرداخت نیست.',
    );
  }

  async findUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
