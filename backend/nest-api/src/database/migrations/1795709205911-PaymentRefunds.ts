import { MigrationInterface, QueryRunner } from 'typeorm';

// Refunds are tracked per payment: which payments of an order must go back
// to the customer, and when each was refunded.
//
// Orders already flagged for a refund get their payments flagged: every
// paid payment of an order that was never fulfilled (pending or
// cancelled), and every paid payment but the first of any other order (it
// was paid twice).
export class PaymentRefunds1795709205911 implements MigrationInterface {
  name = 'PaymentRefunds1795709205911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "nest_schema"."payment"
      ADD "refundRequired" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "nest_schema"."payment"
      ADD "refundedAt" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_refund_due" ON "nest_schema"."payment" ("orderId")
      WHERE "refundRequired"
        AND "refundedAt" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "nest_schema"."payment" p
      SET "refundRequired" = true
      FROM "nest_schema"."order" o
      WHERE p."orderId" = o."id"
        AND o."refundStatus" IN ('required', 'refunded')
        AND p."status" = 'paid'
        AND (
          o."status" IN ('pending', 'cancelled')
          OR p."id" > (
            SELECT min(first."id") FROM "nest_schema"."payment" first
            WHERE first."orderId" = o."id" AND first."status" = 'paid'
          )
        )
    `);
    await queryRunner.query(`
      UPDATE "nest_schema"."payment" p
      SET "refundedAt" = now()
      FROM "nest_schema"."order" o
      WHERE p."orderId" = o."id"
        AND o."refundStatus" = 'refunded'
        AND p."refundRequired"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "nest_schema"."IDX_payment_refund_due"
    `);
    await queryRunner.query(`
      ALTER TABLE "nest_schema"."payment" DROP COLUMN "refundedAt"
    `);
    await queryRunner.query(`
      ALTER TABLE "nest_schema"."payment" DROP COLUMN "refundRequired"
    `);
  }
}
