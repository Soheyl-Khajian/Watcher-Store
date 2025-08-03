import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload_schema"."products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "payload_schema"."products_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"spec_name" varchar NOT NULL,
  	"spec_value" varchar NOT NULL
  );
  
  CREATE TABLE "payload_schema"."products_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL
  );
  
  ALTER TABLE "payload_schema"."products" DROP CONSTRAINT "products_thumbnail_id_media_id_fk";
  
  DROP INDEX "payload_schema"."products_thumbnail_idx";
  ALTER TABLE "payload_schema"."products_gallery" ADD CONSTRAINT "products_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload_schema"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."products_specifications" ADD CONSTRAINT "products_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."products_features" ADD CONSTRAINT "products_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_gallery_order_idx" ON "payload_schema"."products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "payload_schema"."products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_image_idx" ON "payload_schema"."products_gallery" USING btree ("image_id");
  CREATE INDEX "products_specifications_order_idx" ON "payload_schema"."products_specifications" USING btree ("_order");
  CREATE INDEX "products_specifications_parent_id_idx" ON "payload_schema"."products_specifications" USING btree ("_parent_id");
  CREATE INDEX "products_features_order_idx" ON "payload_schema"."products_features" USING btree ("_order");
  CREATE INDEX "products_features_parent_id_idx" ON "payload_schema"."products_features" USING btree ("_parent_id");
  ALTER TABLE "payload_schema"."products" DROP COLUMN "resolution";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "lens_type";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "focal_length";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "wdr";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "night_vision_range";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "night_vision_type";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "ip_rating";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "has_microphone";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "supports_s_d_card";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "is_po_e";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "is_starlight";
  ALTER TABLE "payload_schema"."products" DROP COLUMN "thumbnail_id";
  DROP TYPE "payload_schema"."enum_products_resolution";
  DROP TYPE "payload_schema"."enum_products_lens_type";
  DROP TYPE "payload_schema"."enum_products_night_vision_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_schema"."enum_products_resolution" AS ENUM('2MP', '4MP', '5MP', '6MP', '8MP', '8x2MP (پانورامیک)', '4x2MP (پانورامیک)', '3x2MP (پانورامیک)', '2MP Full HD');
  CREATE TYPE "payload_schema"."enum_products_lens_type" AS ENUM('ثابت', 'وری‌فوکال', 'موتورایز', 'اپتیکال');
  CREATE TYPE "payload_schema"."enum_products_night_vision_type" AS ENUM('IR', 'Warm Light', 'Warm Light/IR', 'نور دوگانه هوشمند', 'نور دوگانه فعال/گرم');
  ALTER TABLE "payload_schema"."products_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_schema"."products_specifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_schema"."products_features" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload_schema"."products_gallery" CASCADE;
  DROP TABLE "payload_schema"."products_specifications" CASCADE;
  DROP TABLE "payload_schema"."products_features" CASCADE;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "resolution" "payload_schema"."enum_products_resolution";
  ALTER TABLE "payload_schema"."products" ADD COLUMN "lens_type" "payload_schema"."enum_products_lens_type";
  ALTER TABLE "payload_schema"."products" ADD COLUMN "focal_length" varchar;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "wdr" varchar;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "night_vision_range" numeric;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "night_vision_type" "payload_schema"."enum_products_night_vision_type";
  ALTER TABLE "payload_schema"."products" ADD COLUMN "ip_rating" varchar;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "has_microphone" boolean DEFAULT false;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "supports_s_d_card" boolean DEFAULT false;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "is_po_e" boolean DEFAULT false;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "is_starlight" boolean DEFAULT false;
  ALTER TABLE "payload_schema"."products" ADD COLUMN "thumbnail_id" integer NOT NULL;
  ALTER TABLE "payload_schema"."products" ADD CONSTRAINT "products_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload_schema"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "products_thumbnail_idx" ON "payload_schema"."products" USING btree ("thumbnail_id");`)
}
