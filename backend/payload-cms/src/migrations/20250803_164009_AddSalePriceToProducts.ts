import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."products" ADD COLUMN "sale_price" numeric;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "is_on_sale" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."products" DROP COLUMN "sale_price";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "is_on_sale";`)
}
