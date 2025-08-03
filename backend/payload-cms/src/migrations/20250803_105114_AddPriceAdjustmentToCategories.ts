import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_schema"."enum_categories_price_adjustment_adjustment_type" AS ENUM('discount', 'increase');
  ALTER TABLE "payload_schema"."categories" ADD COLUMN "price_adjustment_adjustment_type" "payload_schema"."enum_categories_price_adjustment_adjustment_type";
  ALTER TABLE "payload_schema"."categories" ADD COLUMN "price_adjustment_adjustment_value" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."categories" DROP COLUMN "price_adjustment_adjustment_type";
  ALTER TABLE "payload_schema"."categories" DROP COLUMN "price_adjustment_adjustment_value";
  DROP TYPE "payload_schema"."enum_categories_price_adjustment_adjustment_type";`)
}
