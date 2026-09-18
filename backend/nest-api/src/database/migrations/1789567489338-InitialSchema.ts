import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789567489338 implements MigrationInterface {
    name = 'InitialSchema1789567489338'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "nest_schema"."cart" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, CONSTRAINT "PK_c524ec48751b9b5bcfbf6e59be7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_756f53ab9466eb52a52619ee01" ON "nest_schema"."cart" ("userId") `);
        await queryRunner.query(`CREATE TABLE "nest_schema"."cart_item" ("id" SERIAL NOT NULL, "productId" character varying NOT NULL, "quantity" integer NOT NULL, "cartId" integer, CONSTRAINT "UQ_cart_item_cart_product" UNIQUE ("cartId", "productId"), CONSTRAINT "PK_bd94725aa84f8cf37632bcde997" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nest_schema"."order_item" ("id" SERIAL NOT NULL, "productId" character varying NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, "orderId" integer, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "nest_schema"."order_status_enum" AS ENUM('pending', 'processing', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "nest_schema"."order" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "total" numeric(10,2) NOT NULL, "status" "nest_schema"."order_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."cart_item" ADD CONSTRAINT "FK_29e590514f9941296f3a2440d39" FOREIGN KEY ("cartId") REFERENCES "nest_schema"."cart"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "nest_schema"."order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nest_schema"."order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."cart_item" DROP CONSTRAINT "FK_29e590514f9941296f3a2440d39"`);
        await queryRunner.query(`DROP TABLE "nest_schema"."order"`);
        await queryRunner.query(`DROP TYPE "nest_schema"."order_status_enum"`);
        await queryRunner.query(`DROP TABLE "nest_schema"."order_item"`);
        await queryRunner.query(`DROP TABLE "nest_schema"."cart_item"`);
        await queryRunner.query(`DROP INDEX "nest_schema"."IDX_756f53ab9466eb52a52619ee01"`);
        await queryRunner.query(`DROP TABLE "nest_schema"."cart"`);
    }

}
