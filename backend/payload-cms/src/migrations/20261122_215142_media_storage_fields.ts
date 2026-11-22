import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "payload_schema"."media" ADD COLUMN "_objectkey" varchar;`);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."media" DROP COLUMN "prefix";
  ALTER TABLE "payload_schema"."media" DROP COLUMN "_objectkey";`);
}
