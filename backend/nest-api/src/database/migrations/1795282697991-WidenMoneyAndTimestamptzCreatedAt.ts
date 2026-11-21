import { MigrationInterface, QueryRunner } from 'typeorm';

// - order.total and order_item.price: numeric(10,2) -> numeric(14,0).
//   Amounts are whole toman; the old type capped them at 99,999,999.
// - order.createdAt: timestamp -> timestamptz, converted in place. Existing
//   values were written in the database's time zone, UTC.
//
// Written by hand: TypeORM's generated migration dropped and re-added
// "createdAt", which would have reset every existing order's creation time.
export class WidenMoneyAndTimestamptzCreatedAt1795282697991 implements MigrationInterface {
  name = 'WidenMoneyAndTimestamptzCreatedAt1795282697991';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ALTER COLUMN "price" TYPE numeric(14,0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ALTER COLUMN "total" TYPE numeric(14,0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE USING "createdAt" AT TIME ZONE 'UTC'`,
    );
  }

  // Fails if any amount no longer fits numeric(10,2), i.e. above
  // 99,999,999 toman: rolling back must not truncate orders.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ALTER COLUMN "createdAt" TYPE TIMESTAMP USING "createdAt" AT TIME ZONE 'UTC'`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ALTER COLUMN "total" TYPE numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ALTER COLUMN "price" TYPE numeric(10,2)`,
    );
  }
}
