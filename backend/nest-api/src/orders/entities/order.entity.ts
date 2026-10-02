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

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
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

  @CreateDateColumn()
  createdAt!: Date;
}
