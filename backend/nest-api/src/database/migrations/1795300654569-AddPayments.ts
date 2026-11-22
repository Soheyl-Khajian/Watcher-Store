import { MigrationInterface, QueryRunner } from 'typeorm';

// Adds the payment table: one row per attempt to pay an order through a
// gateway (authority, amount in rial, status, reference number, masked card
// number and the gateway's verification answer). Only adds; nothing existing
// changes.

export class AddPayments1795300654569 implements MigrationInterface {
  name = 'AddPayments1795300654569';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "nest_schema"."payment_status_enum" AS ENUM('pending', 'paid', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "nest_schema"."payment" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "gateway" character varying(20) NOT NULL, "authority" character varying(64) NOT NULL, "amountRial" numeric(15,0) NOT NULL, "status" "nest_schema"."payment_status_enum" NOT NULL DEFAULT 'pending', "refId" character varying(64), "cardPan" character varying(32), "gatewayResponse" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "verifiedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_order" ON "nest_schema"."payment" ("orderId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_payment_gateway_authority" ON "nest_schema"."payment" ("gateway", "authority") `,
    );
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."payment" ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES "nest_schema"."order"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "nest_schema"."payment" DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293"`,
    );
    await queryRunner.query(
      `DROP INDEX "nest_schema"."UQ_payment_gateway_authority"`,
    );
    await queryRunner.query(`DROP INDEX "nest_schema"."IDX_payment_order"`);
    await queryRunner.query(`DROP TABLE "nest_schema"."payment"`);
    await queryRunner.query(`DROP TYPE "nest_schema"."payment_status_enum"`);
  }
}
