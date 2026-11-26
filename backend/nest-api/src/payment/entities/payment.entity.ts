// backend/nest-api/src/payment/entities/payment.entity.ts
//
// One attempt to pay an order through a gateway. An order may have several
// (the customer cancels at the gateway and tries again). Normally at most
// one ends up paid; one that arrives when the order cannot take it (paid
// twice, cancelled meanwhile) is flagged for a refund, and so is the paid
// one of an order an administrator cancels.

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { rialColumnTransformer } from '../../common/money/toman';
import { Order } from '../../orders/entities/order.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity()
@Index('UQ_payment_gateway_authority', ['gateway', 'authority'], {
  unique: true,
})
@Index('IDX_payment_status_created', ['status', 'createdAt'])
@Index('IDX_payment_refund_due', ['orderId'], {
  where: '"refundRequired" AND "refundedAt" IS NULL',
})
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('IDX_payment_order')
  @Column()
  orderId!: number;

  @ManyToOne(() => Order, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'orderId' })
  order?: Order;

  // Not an enum, so adding a gateway needs no migration.
  @Column({ type: 'varchar', length: 20 })
  gateway!: string;

  // The gateway's id for this payment.
  @Column({ type: 'varchar', length: 64 })
  authority!: string;

  // The amount sent to the gateway, which must match on verification.
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 0,
    transformer: rialColumnTransformer,
  })
  amountRial!: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  // The gateway's reference number once paid.
  @Column({ type: 'varchar', length: 64, nullable: true })
  refId!: string | null;

  // Masked, e.g. 502229******5995. Never the full number.
  @Column({ type: 'varchar', length: 32, nullable: true })
  cardPan!: string | null;

  // The gateway's verification answer, kept for disputes.
  @Column({ type: 'jsonb', nullable: true })
  gatewayResponse!: unknown;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  // When the gateway was last asked about this payment; the reconciliation
  // job asks about the least recently checked first.
  @Column({ type: 'timestamptz', nullable: true })
  lastCheckedAt!: Date | null;

  // The money must go back to the customer (by hand, in the gateway's
  // panel), until an administrator marks it refunded.
  @Column({ type: 'boolean', default: false })
  refundRequired!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  refundedAt!: Date | null;
}
