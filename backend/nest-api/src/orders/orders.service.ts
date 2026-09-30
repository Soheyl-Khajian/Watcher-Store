// backend/nest-api/src/orders/orders.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { ProductsService } from '../products/products.service';

type PaymentResultOrderStatus = OrderStatus.PROCESSING | OrderStatus.CANCELLED;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private cartService: CartService,
    private productsService: ProductsService,
  ) {}

  async createOrder(userId: number): Promise<Order> {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید شما خالی است.');
    }

    const orderItems: OrderItem[] = [];
    let total = 0;

    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);

      const currentPrice = this.productsService.getCurrentPrice(product);

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = currentPrice;
      orderItems.push(orderItem);

      total += currentPrice * item.quantity;
    }

    const order = this.orderRepository.create({
      userId,
      items: orderItems,
      total,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);
    await this.cartService.clearCart(userId);
    return savedOrder;
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
