import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds order.stockReserved: true while the order holds its products' stock.
//
// From now on stock is reserved when an order is placed. Before, it was
// taken only when an order was paid, so existing orders are backfilled to
// match what they actually hold:
// - processing, shipped, completed: paid, so they hold stock -> true
// - pending: nothing was taken yet -> false (taken if paid later)
// - cancelled: paid ones got their stock back on cancellation -> false
export class AddOrderStockReserved1795283714442 implements MigrationInterface {
  name = 'AddOrderStockReserved1795283714442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ADD "stockReserved" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "nest_schema"."order" SET "stockReserved" = true WHERE "status" IN ('processing', 'shipped', 'completed')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" DROP COLUMN "stockReserved"`,
    );
  }
}
