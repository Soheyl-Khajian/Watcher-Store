import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderLifecycle1793296195592 implements MigrationInterface {
    name = 'AddOrderLifecycle1793296195592'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "nest_schema"."order_refundstatus_enum" AS ENUM('none', 'required', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "refundStatus" "nest_schema"."order_refundstatus_enum" NOT NULL DEFAULT 'none'`);
        await queryRunner.query(`CREATE TYPE "nest_schema"."order_cancelreason_enum" AS ENUM('customer_request', 'admin', 'expired', 'payment_failed')`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "cancelReason" "nest_schema"."order_cancelreason_enum"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "trackingCode" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "paidAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "shippedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "completedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ADD "cancelledAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TYPE "nest_schema"."order_status_enum" RENAME TO "order_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "nest_schema"."order_status_enum" AS ENUM('pending', 'processing', 'shipped', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" TYPE "nest_schema"."order_status_enum" USING "status"::"text"::"nest_schema"."order_status_enum"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "nest_schema"."order_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "nest_schema"."order_status_enum_old" AS ENUM('pending', 'processing', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" TYPE "nest_schema"."order_status_enum_old" USING "status"::"text"::"nest_schema"."order_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "nest_schema"."order_status_enum"`);
        await queryRunner.query(`ALTER TYPE "nest_schema"."order_status_enum_old" RENAME TO "order_status_enum"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "cancelledAt"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "completedAt"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "shippedAt"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "paidAt"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "trackingCode"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "cancelReason"`);
        await queryRunner.query(`DROP TYPE "nest_schema"."order_cancelreason_enum"`);
        await queryRunner.query(`ALTER TABLE "nest_schema"."order" DROP COLUMN "refundStatus"`);
        await queryRunner.query(`DROP TYPE "nest_schema"."order_refundstatus_enum"`);
    }

}
