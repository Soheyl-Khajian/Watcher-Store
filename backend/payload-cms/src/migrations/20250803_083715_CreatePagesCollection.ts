import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload_schema"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" jsonb,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload_schema"."pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "payload_schema"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload_schema"."pages" USING btree ("created_at");
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload_schema"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_schema"."pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload_schema"."pages" CASCADE;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  DROP INDEX "payload_schema"."payload_locked_documents_rels_pages_id_idx";
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" DROP COLUMN "pages_id";`)
}
