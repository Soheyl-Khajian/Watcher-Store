// backend/nest-api/src/orders/entities/order-item.entity.ts

import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { tomanColumnTransformer } from '../../common/money/toman';
import { Order } from './order.entity';

@Entity()
// Postgres does not index a foreign key by itself, and every order is
// loaded with its items.
@Index('IDX_order_item_order', ['order'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: string;

  @Column()
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 14,
    scale: 0,
    transformer: tomanColumnTransformer,
  })
  price!: number;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: Order;
}
