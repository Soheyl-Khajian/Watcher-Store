// src/cart/entities/cart-item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Cart } from './cart.entity';

@Entity()
@Unique('UQ_cart_item_cart_product', ['cart', 'productId'])
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  productId!: string;

  @Column()
  quantity!: number;

  @ManyToOne(() => Cart, (cart) => cart.items)
  cart!: Cart;
}