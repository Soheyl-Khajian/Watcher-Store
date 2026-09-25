import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_schema"."enum_pages_status" AS ENUM('draft', 'published');
  ALTER TABLE "payload_schema"."pages" ADD COLUMN "status" "payload_schema"."enum_pages_status" DEFAULT 'draft' NOT NULL;`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."pages" DROP COLUMN "status";
  DROP TYPE "payload_schema"."enum_pages_status";`);
}
