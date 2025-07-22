// src/cart/entities/cart-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Cart } from './cart.entity';

@Entity()
export class CartItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: string;

  @Column()
  quantity: number;

  @ManyToOne(() => Cart, (cart) => cart.items)
  cart: Cart;
}
