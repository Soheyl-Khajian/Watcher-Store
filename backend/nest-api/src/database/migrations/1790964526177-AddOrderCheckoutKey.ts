import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCheckoutKey1790964526177 implements MigrationInterface {
  name = 'AddOrderCheckoutKey1790964526177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" ADD "checkoutKey" uuid NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_order_user_checkout_key" ON "nest_schema"."order" ("userId", "checkoutKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "nest_schema"."UQ_order_user_checkout_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order" DROP COLUMN "checkoutKey"`,
    );
  }
}
