// backend/nest-api/src/orders/entities/shipping-details.ts

import { Column } from 'typeorm';

// Embedded in Order as a snapshot of where the order ships. Columns are
// nullable only so orders created before shipping details were collected stay
// valid; the API requires every mandatory field for each new order.
export class ShippingDetails {
  @Column({ type: 'varchar', length: 100, nullable: true })
  recipientName!: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  province!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  floor!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  deliveryNotes!: string | null;
}
