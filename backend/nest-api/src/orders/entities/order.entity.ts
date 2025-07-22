// src/orders/entities/order.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

// یک نوع داده برای وضعیت سفارش تعریف می‌کنیم
export enum OrderStatus {
  PENDING = 'pending', // در انتظار پرداخت
  PROCESSING = 'processing', // در حال پردازش
  COMPLETED = 'completed', // تکمیل شده
  CANCELLED = 'cancelled', // لغو شده
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn() // یک شناسه عددی منحصر به فرد که به صورت خودکار افزایش می‌یابد
  id: number;

  // به جای ارتباط، فقط شناسه کاربر را ذخیره می‌کنیم
  @Column()
  userId: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;
}
