import { MigrationInterface, QueryRunner } from 'typeorm';

// Indexes for the queries the API runs on every order load and list, the
// expiry job, payment reconciliation and the count of refunds owed, and payment.lastCheckedAt, so the
// reconciliation job asks about the least recently checked payments first.
// Only adds; nothing existing changes.

export class AddQueryIndexesAndPaymentCheck1795700000000 implements MigrationInterface {
  name = 'AddQueryIndexesAndPaymentCheck1795700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."payment" ADD "lastCheckedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_item_order" ON "nest_schema"."order_item" ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_created_id" ON "nest_schema"."order" ("createdAt", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_user_created" ON "nest_schema"."order" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_status_created" ON "nest_schema"."order" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_status_created" ON "nest_schema"."payment" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_refund_status" ON "nest_schema"."order" ("refundStatus") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "nest_schema"."IDX_order_refund_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "nest_schema"."IDX_payment_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "nest_schema"."IDX_order_status_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "nest_schema"."IDX_order_user_created"`,
    );
    await queryRunner.query(`DROP INDEX "nest_schema"."IDX_order_created_id"`);
    await queryRunner.query(`DROP INDEX "nest_schema"."IDX_order_item_order"`);
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."payment" DROP COLUMN "lastCheckedAt"`,
    );
  }
}
