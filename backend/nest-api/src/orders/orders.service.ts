// backend/nest-api/src/orders/orders.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { isTomanAmount } from '../common/money/toman';

type PaymentResultOrderStatus = OrderStatus.PROCESSING | OrderStatus.CANCELLED;

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async createOrder(userId: number, checkoutKey: string): Promise<Order> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const cartRepository = manager.getRepository(Cart);
        const cartItemRepository = manager.getRepository(CartItem);
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);

        const existingOrder = await this.findOrderByCheckoutKey(
          orderRepository,
          userId,
          checkoutKey,
        );

        if (existingOrder) {
          return existingOrder;
        }

        const cart = await cartRepository.findOne({
          where: { userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!cart) {
          throw new BadRequestException('سبد خرید شما خالی است.');
        }

        // A concurrent request with the same key may have committed while this
        // request was waiting for the cart lock.
        const orderCreatedWhileWaiting = await this.findOrderByCheckoutKey(
          orderRepository,
          userId,
          checkoutKey,
        );

        if (orderCreatedWhileWaiting) {
          return orderCreatedWhileWaiting;
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
          const availableStock =
            this.productsService.getAvailableStock(product);

          if (availableStock < item.quantity) {
            throw new ConflictException(
              `موجودی محصول با شناسه ${item.productId} کافی نیست.`,
            );
          }

          const orderItem = orderItemRepository.create({
            productId: item.productId,
            quantity: item.quantity,
            price: currentPrice,
          });

          orderItems.push(orderItem);

          const lineTotal = currentPrice * item.quantity;
          const nextTotal = total + lineTotal;

          if (!isTomanAmount(lineTotal) || !isTomanAmount(nextTotal)) {
            throw new BadRequestException(
              'مبلغ سفارش از محدوده مجاز بیشتر است.',
            );
          }

          total = nextTotal;
        }

        const order = orderRepository.create({
          userId,
          checkoutKey,
          items: orderItems,
          total,
          status: OrderStatus.PENDING,
        });

        await orderRepository.save(order);
        await cartItemRepository.remove(cartItems);

        const createdOrder = await this.findOrderByCheckoutKey(
          orderRepository,
          userId,
          checkoutKey,
        );

        if (!createdOrder) {
          throw new InternalServerErrorException(
            'امکان بارگذاری سفارش ثبت‌شده وجود ندارد.',
          );
        }

        return createdOrder;
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        const existingOrder = await this.findOrderByCheckoutKey(
          this.orderRepository,
          userId,
          checkoutKey,
        );

        if (existingOrder) {
          return existingOrder;
        }
      }

      throw error;
    }
  }

  private findOrderByCheckoutKey(
    orderRepository: Repository<Order>,
    userId: number,
    checkoutKey: string,
  ): Promise<Order | null> {
    return orderRepository.findOne({
      where: {
        userId,
        checkoutKey,
      },
      relations: ['items'],
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
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);

      const order = await orderRepository.findOne({
        where: {
          id,
          userId,
        },
        lock: {
          mode: 'pessimistic_write',
        },
      });

      if (!order) {
        throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException(
          'این سفارش قبلاً پردازش شده یا دیگر قابل پرداخت نیست.',
        );
      }

      if (nextStatus === OrderStatus.PROCESSING) {
        const orderItems = await orderItemRepository.find({
          where: {
            order: {
              id: order.id,
            },
          },
          order: {
            productId: 'ASC',
            id: 'ASC',
          },
        });

        if (orderItems.length === 0) {
          throw new InternalServerErrorException(
            'سفارش ثبت‌شده فاقد آیتم است.',
          );
        }

        for (const item of orderItems) {
          const consumed = await this.productsService.consumeStock(
            manager,
            item.productId,
            item.quantity,
          );

          if (!consumed) {
            throw new ConflictException(
              `موجودی محصول با شناسه ${item.productId} برای تکمیل پرداخت کافی نیست.`,
            );
          }
        }
      }

      order.status = nextStatus;
      return orderRepository.save(order);
    });
  }

  async findAllOrdersForAdmin(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['items'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
