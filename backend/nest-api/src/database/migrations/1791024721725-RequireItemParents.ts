import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireItemParents1791024721725 implements MigrationInterface {
  name = 'RequireItemParents1791024721725';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" DROP CONSTRAINT "FK_29e590514f9941296f3a2440d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" DROP CONSTRAINT "UQ_cart_item_cart_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ALTER COLUMN "cartId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ALTER COLUMN "orderId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ADD CONSTRAINT "UQ_cart_item_cart_product" UNIQUE ("cartId", "productId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ADD CONSTRAINT "FK_29e590514f9941296f3a2440d39" FOREIGN KEY ("cartId") REFERENCES "nest_schema"."cart"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "nest_schema"."order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" DROP CONSTRAINT "FK_29e590514f9941296f3a2440d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" DROP CONSTRAINT "UQ_cart_item_cart_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ALTER COLUMN "orderId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ALTER COLUMN "cartId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ADD CONSTRAINT "UQ_cart_item_cart_product" UNIQUE ("cartId", "productId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "nest_schema"."order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."cart_item" ADD CONSTRAINT "FK_29e590514f9941296f3a2440d39" FOREIGN KEY ("cartId") REFERENCES "nest_schema"."cart"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
