// src/cart/entities/cart.entity.ts
import { Entity, PrimaryGeneratedColumn, OneToMany, Column } from 'typeorm';
import { CartItem } from './cart-item.entity';

@Entity()
export class Cart {
  @PrimaryGeneratedColumn()
  id: number;

  // به جای ارتباط، فقط شناسه کاربر را ذخیره می‌کنیم
  @Column()
  userId: number;

  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true }) //پراپرتی آیتمز که در خط بعد تعریف شده، آرایه‌ای از انتیتی‌های کارت_آیتم خواهد بود
  items: CartItem[];
}
