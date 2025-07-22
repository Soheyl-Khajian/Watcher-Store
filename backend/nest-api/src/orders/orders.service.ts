// src/orders/orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private cartService: CartService,
  ) {}

  async createOrder(userId: number): Promise<Order> {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید شما خالی است.');
    }

    // یک آرایه برای نگهداری آیتم‌های سفارش با قیمت واقعی
    const orderItems: OrderItem[] = [];
    let total = 0;

    // به ازای هر آیتم در سبد خرید، قیمت واقعی را از پیلود بپرس
    for (const item of cart.items) {
      // این آدرس API محصولات در پیلود است
      const response = await fetch(
        `http://localhost:3000/api/products/${item.productId}`,
      );
      if (!response.ok) {
        throw new NotFoundException(
          `محصول با شناسه ${item.productId} یافت نشد.`,
        );
      }
      const productData = await response.json();
      const currentPrice = productData.price;

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = currentPrice; // <-- قیمت واقعی را اینجا ثبت می‌کنیم
      orderItems.push(orderItem);

      // قیمت کل را محاسبه می‌کنیم
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

  async findUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
