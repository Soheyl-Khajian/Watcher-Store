import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_schema"."enum_footer_social_links_platform" AS ENUM('Instagram', 'Linkedin', 'Telegram');
  CREATE TABLE "payload_schema"."footer_link_columns_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "payload_schema"."footer_link_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "payload_schema"."footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "payload_schema"."enum_footer_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "payload_schema"."footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_schema"."footer_link_columns_links" ADD CONSTRAINT "footer_link_columns_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."footer_link_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."footer_link_columns" ADD CONSTRAINT "footer_link_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_link_columns_links_order_idx" ON "payload_schema"."footer_link_columns_links" USING btree ("_order");
  CREATE INDEX "footer_link_columns_links_parent_id_idx" ON "payload_schema"."footer_link_columns_links" USING btree ("_parent_id");
  CREATE INDEX "footer_link_columns_order_idx" ON "payload_schema"."footer_link_columns" USING btree ("_order");
  CREATE INDEX "footer_link_columns_parent_id_idx" ON "payload_schema"."footer_link_columns" USING btree ("_parent_id");
  CREATE INDEX "footer_social_links_order_idx" ON "payload_schema"."footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "payload_schema"."footer_social_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload_schema"."footer_link_columns_links" CASCADE;
  DROP TABLE "payload_schema"."footer_link_columns" CASCADE;
  DROP TABLE "payload_schema"."footer_social_links" CASCADE;
  DROP TABLE "payload_schema"."footer" CASCADE;
  DROP TYPE "payload_schema"."enum_footer_social_links_platform";`)
}
