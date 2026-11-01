// backend/nest-api/src/orders/orders.service.ts

import type { ShippingDetailsDto } from './dto/create-order.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Cart } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { OrderItem } from './entities/order-item.entity';
import {
  Order,
  OrderCancelReason,
  OrderRefundStatus,
  OrderStatus,
} from './entities/order.entity';
import { assertTransition } from './order-state';
import { PaginatedOrdersResponseDto } from './dto/order-response.dto';
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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly productsService: ProductsService,
  ) {}

  async createOrder(
    userId: number,
    checkoutKey: string,
    shipping: ShippingDetailsDto,
  ): Promise<Order> {
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
          shipping: {
            recipientName: shipping.recipientName,
            phone: shipping.phone,
            province: shipping.province,
            city: shipping.city,
            address: shipping.address,
            postalCode: shipping.postalCode,
            unit: shipping.unit ?? null,
            floor: shipping.floor ?? null,
            deliveryNotes: shipping.deliveryNotes ?? null,
          },
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

      assertTransition(
        order.status,
        nextStatus,
        'این سفارش قبلاً پردازش شده یا دیگر قابل پرداخت نیست.',
      );

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

      const now = new Date();

      if (nextStatus === OrderStatus.PROCESSING) {
        order.paidAt = now;
      } else {
        order.cancelledAt = now;
        order.cancelReason = OrderCancelReason.PAYMENT_FAILED;
      }

      order.status = nextStatus;
      return orderRepository.save(order);
    });
  }

  // Customers may cancel only their own unpaid orders. Paid orders hold stock
  // and money, so those go through an administrator.
  async cancelOwnPendingOrder(id: number, userId: number): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);

      // The row lock serialises this with payment verification, so a cancel
      // and a payment can never both succeed.
      const order = await orderRepository.findOne({
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException(
          'فقط سفارش‌های پرداخت‌نشده قابل لغو هستند. برای سفارش‌های پرداخت‌شده با پشتیبانی تماس بگیرید.',
        );
      }

      assertTransition(
        order.status,
        OrderStatus.CANCELLED,
        'این سفارش دیگر قابل لغو نیست.',
      );

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = OrderCancelReason.CUSTOMER_REQUEST;
      await orderRepository.save(order);

      // Loaded separately: row locks cannot be combined with joined relations.
      const cancelled = await orderRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      if (!cancelled) {
        throw new InternalServerErrorException(
          'امکان بارگذاری سفارش لغوشده وجود ندارد.',
        );
      }

      cancelled.items.sort((a, b) => a.id - b.id);

      return cancelled;
    });
  }

  // Runs an administrator action on an order inside a transaction that holds
  // the row lock, so concurrent actions and payments are serialised.
  private async mutateOrder(
    id: number,
    mutate: (order: Order, manager: EntityManager) => Promise<void>,
  ): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);

      const order = await orderRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException(`سفارش با شناسه ${id} یافت نشد.`);
      }

      await mutate(order, manager);
      await orderRepository.save(order);

      // Loaded separately: row locks cannot be combined with joined relations.
      const updated = await orderRepository.findOne({
        where: { id },
        relations: ['items'],
      });

      if (!updated) {
        throw new InternalServerErrorException(
          'امکان بارگذاری سفارش وجود ندارد.',
        );
      }

      updated.items.sort((a, b) => a.id - b.id);

      return updated;
    });
  }

  async shipOrder(id: number, trackingCode: string | null): Promise<Order> {
    return this.mutateOrder(id, (order) => {
      assertTransition(
        order.status,
        OrderStatus.SHIPPED,
        'فقط سفارش‌های پرداخت‌شده (در حال پردازش) قابل ارسال هستند.',
      );

      order.status = OrderStatus.SHIPPED;
      order.shippedAt = new Date();
      order.trackingCode = trackingCode;

      return Promise.resolve();
    });
  }

  async completeOrder(id: number): Promise<Order> {
    return this.mutateOrder(id, (order) => {
      assertTransition(
        order.status,
        OrderStatus.COMPLETED,
        'فقط سفارش‌های ارسال‌شده قابل تکمیل هستند.',
      );

      order.status = OrderStatus.COMPLETED;
      order.completedAt = new Date();

      return Promise.resolve();
    });
  }

  // Cancelling a paid order puts its stock back and flags it for a manual
  // refund. Cancelling an unpaid order changes neither.
  async cancelOrderAsAdmin(id: number): Promise<Order> {
    return this.mutateOrder(id, async (order, manager) => {
      assertTransition(
        order.status,
        OrderStatus.CANCELLED,
        'این سفارش دیگر قابل لغو نیست.',
      );

      if (order.status === OrderStatus.PROCESSING) {
        await this.restoreOrderStock(manager, order.id);
        order.refundStatus = OrderRefundStatus.REQUIRED;
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = OrderCancelReason.ADMIN;
    });
  }

  async markOrderRefunded(id: number): Promise<Order> {
    return this.mutateOrder(id, (order) => {
      if (order.refundStatus !== OrderRefundStatus.REQUIRED) {
        throw new ConflictException(
          'این سفارش نیازی به بازپرداخت ندارد یا قبلاً بازپرداخت شده است.',
        );
      }

      order.refundStatus = OrderRefundStatus.REFUNDED;

      return Promise.resolve();
    });
  }

  private async restoreOrderStock(
    manager: EntityManager,
    orderId: number,
  ): Promise<void> {
    const orderItems = await manager.getRepository(OrderItem).find({
      where: { order: { id: orderId } },
      order: { productId: 'ASC', id: 'ASC' },
    });

    for (const item of orderItems) {
      const restored = await this.productsService.restoreStock(
        manager,
        item.productId,
        item.quantity,
      );

      // A product deleted after the sale cannot get its stock back, but that
      // must not stop an administrator from cancelling the order.
      if (!restored) {
        this.logger.warn(
          `Stock not restored for product ${item.productId} on order ${orderId}: product not found.`,
        );
      }
    }
  }

  async findOrdersForAdmin(
    page: number,
    limit: number,
  ): Promise<PaginatedOrdersResponseDto> {
    const [items, totalItems] = await this.orderRepository.findAndCount({
      relations: ['items'],
      // The id tiebreaker keeps page boundaries deterministic when several
      // orders share a creation timestamp.
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // TypeORM's two-step skip/take query is fragile when ordering by joined columns.
    // This ensures the items are sorted deterministically.
    for (const order of items) {
      order.items.sort((a, b) => a.id - b.id);
    }

    return {
      items,
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  async findUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }
}
