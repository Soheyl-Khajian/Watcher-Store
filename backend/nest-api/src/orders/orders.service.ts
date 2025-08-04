// مسیر فایل: nest-api/src/orders/orders.service.ts

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
import { ProductsService } from '../products/products.service'; // ۱. سرویس جدید را وارد کنید

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private cartService: CartService,
    private productsService: ProductsService, // ۲. سرویس جدید را به constructor تزریق کنید
  ) {}

  async createOrder(userId: number): Promise<Order> {
    const cart = await this.cartService.getCart(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('سبد خرید شما خالی است.');
    }

    const orderItems: OrderItem[] = [];
    let total = 0;

    // ۳. منطق دریافت قیمت محصول به طور کامل بازنویسی شد
    for (const item of cart.items) {
      // به جای fetch مستقیم، از سرویس محصولات استفاده می‌کنیم
      const product = await this.productsService.findOne(item.productId);

      // قیمت صحیح (با در نظر گرفتن تخفیف) را از سرویس محصولات می‌گیریم
      const currentPrice = this.productsService.getCurrentPrice(product);

      const orderItem = new OrderItem();
      orderItem.productId = item.productId;
      orderItem.quantity = item.quantity;
      orderItem.price = currentPrice; // <-- قیمت نهایی و صحیح اینجا ثبت می‌شود
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
    const order = await this.orderRepository.findOne({ where: { id, userId } });
    if (!order) {
      throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
    }
    return order;
  }

  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
    }
    order.status = status;
    return this.orderRepository.save(order);
  }

  async findUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
