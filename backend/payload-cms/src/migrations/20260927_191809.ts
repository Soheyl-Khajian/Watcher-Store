import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."users" ADD COLUMN "display_name" varchar DEFAULT 'Watcher Store Team' NOT NULL;`);

  await db.execute(sql`
    UPDATE "payload_schema"."posts"
    SET "author_name" = 'Watcher Store Team'
  `);
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."users" DROP COLUMN "display_name";`);
}
