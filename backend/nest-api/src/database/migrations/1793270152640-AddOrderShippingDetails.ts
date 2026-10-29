import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderShippingDetails1793270152640 implements MigrationInterface {
    name = 'AddOrderShippingDetails1793270152640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingRecipientname" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingPhone" character varying(11)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingProvince" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingCity" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingAddress" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingPostalcode" character varying(10)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingUnit" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingFloor" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippingDeliverynotes" character varying(500)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingDeliverynotes"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingFloor"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingUnit"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingPostalcode"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingAddress"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingCity"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingProvince"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingPhone"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippingRecipientname"`);
    }

}
