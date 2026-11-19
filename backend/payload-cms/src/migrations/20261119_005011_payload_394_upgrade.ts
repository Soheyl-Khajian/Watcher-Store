import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload_schema"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  ALTER TABLE "payload_schema"."users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_schema"."payload_kv" USING btree ("key");`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload_schema"."payload_kv" CASCADE;
  ALTER TABLE "payload_schema"."users" DROP COLUMN "reset_password_requested_at";`);
}
