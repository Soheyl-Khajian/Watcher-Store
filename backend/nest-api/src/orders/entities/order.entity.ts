// backend/nest-api/src/orders/entities/order.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { tomanColumnTransformer } from '../../common/money/toman';
import { OrderItem } from './order-item.entity';
import { ShippingDetails } from './shipping-details';

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OrderCancelReason {
  CUSTOMER_REQUEST = 'customer_request',
  ADMIN = 'admin',
  EXPIRED = 'expired',
  PAYMENT_FAILED = 'payment_failed',
}

export enum OrderRefundStatus {
  NONE = 'none',
  REQUIRED = 'required',
  REFUNDED = 'refunded',
}

@Entity()
@Index('UQ_order_user_checkout_key', ['userId', 'checkoutKey'], {
  unique: true,
})
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({
    type: 'uuid',
    select: false,
  })
  checkoutKey!: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @Column(() => ShippingDetails)
  shipping!: ShippingDetails;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: tomanColumnTransformer,
  })
  total!: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: 'enum',
    enum: OrderRefundStatus,
    default: OrderRefundStatus.NONE,
  })
  refundStatus!: OrderRefundStatus;

  @Column({
    type: 'enum',
    enum: OrderCancelReason,
    nullable: true,
  })
  cancelReason!: OrderCancelReason | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  trackingCode!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  shippedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
