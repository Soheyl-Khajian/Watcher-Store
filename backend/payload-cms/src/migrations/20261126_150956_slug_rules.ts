import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// Every page needs a slug now (fields/slug.ts). A page saved without one
// (possible before) gets page-<id>, which an editor can change.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "payload_schema"."pages" SET "slug" = 'page-' || "id"
     WHERE "slug" IS NULL OR "slug" = '';
   ALTER TABLE "payload_schema"."pages" ALTER COLUMN "slug" SET NOT NULL;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."pages" ALTER COLUMN "slug" DROP NOT NULL;`);
}
