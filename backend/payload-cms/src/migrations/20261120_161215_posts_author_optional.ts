import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."posts" ALTER COLUMN "author_id" DROP NOT NULL;`);
}

// Fails if any post has no author, i.e. after a writer was deleted: rolling
// back must not invent authors for those posts.
export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."posts" ALTER COLUMN "author_id" SET NOT NULL;`);
}
