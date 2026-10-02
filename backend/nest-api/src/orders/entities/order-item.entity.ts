// backend/nest-api/src/orders/entities/order-item.entity.ts

import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { tomanColumnTransformer } from '../../common/money/toman';
import { Order } from './order.entity';

@Entity()
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: string;

  @Column()
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: tomanColumnTransformer,
  })
  price!: number;

  @ManyToOne(() => Order, (order) => order.items)
  order!: Order;
}
