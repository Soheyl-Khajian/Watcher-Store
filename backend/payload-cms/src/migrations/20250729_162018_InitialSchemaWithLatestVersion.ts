import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload_schema"."enum_users_role" AS ENUM('admin', 'customer');
  CREATE TYPE "payload_schema"."enum_products_resolution" AS ENUM('2MP', '4MP', '5MP', '6MP', '8MP', '8x2MP (پانورامیک)', '4x2MP (پانورامیک)', '3x2MP (پانورامیک)', '2MP Full HD');
  CREATE TYPE "payload_schema"."enum_products_lens_type" AS ENUM('ثابت', 'وری‌فوکال', 'موتورایز', 'اپتیکال');
  CREATE TYPE "payload_schema"."enum_products_night_vision_type" AS ENUM('IR', 'Warm Light', 'Warm Light/IR', 'نور دوگانه هوشمند', 'نور دوگانه فعال/گرم');
  CREATE TYPE "payload_schema"."enum_products_status" AS ENUM('published', 'draft');
  CREATE TYPE "payload_schema"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TABLE "payload_schema"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload_schema"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "payload_schema"."enum_users_role" DEFAULT 'customer' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_schema"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_schema"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"description" jsonb,
  	"resolution" "payload_schema"."enum_products_resolution",
  	"lens_type" "payload_schema"."enum_products_lens_type",
  	"focal_length" varchar,
  	"wdr" varchar,
  	"night_vision_range" numeric,
  	"night_vision_type" "payload_schema"."enum_products_night_vision_type",
  	"ip_rating" varchar,
  	"has_microphone" boolean DEFAULT false,
  	"supports_s_d_card" boolean DEFAULT false,
  	"is_po_e" boolean DEFAULT false,
  	"is_starlight" boolean DEFAULT false,
  	"slug" varchar NOT NULL,
  	"status" "payload_schema"."enum_products_status" DEFAULT 'draft',
  	"price" numeric NOT NULL,
  	"stock" numeric DEFAULT 0,
  	"thumbnail_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_schema"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "payload_schema"."posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"content" jsonb,
  	"status" "payload_schema"."enum_posts_status" DEFAULT 'draft',
  	"published_date" timestamp(3) with time zone,
  	"author_id" integer NOT NULL,
  	"thumbnail_id" integer NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_schema"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "payload_schema"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_schema"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"categories_id" integer,
  	"products_id" integer,
  	"posts_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_schema"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_schema"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_schema"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_schema"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload_schema"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_schema"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload_schema"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."products" ADD CONSTRAINT "products_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload_schema"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_schema"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload_schema"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "payload_schema"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."posts" ADD CONSTRAINT "posts_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "payload_schema"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_schema"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload_schema"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload_schema"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload_schema"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "payload_schema"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload_schema"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload_schema"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_schema"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload_schema"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload_schema"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload_schema"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload_schema"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload_schema"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload_schema"."users" USING btree ("email");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "payload_schema"."categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "payload_schema"."categories" USING btree ("parent_id");
  CREATE INDEX "categories_image_idx" ON "payload_schema"."categories" USING btree ("image_id");
  CREATE INDEX "categories_updated_at_idx" ON "payload_schema"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "payload_schema"."categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "products_sku_idx" ON "payload_schema"."products" USING btree ("sku");
  CREATE UNIQUE INDEX "products_slug_idx" ON "payload_schema"."products" USING btree ("slug");
  CREATE INDEX "products_thumbnail_idx" ON "payload_schema"."products" USING btree ("thumbnail_id");
  CREATE INDEX "products_updated_at_idx" ON "payload_schema"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload_schema"."products" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "payload_schema"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "payload_schema"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "payload_schema"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "payload_schema"."products_rels" USING btree ("categories_id");
  CREATE INDEX "posts_author_idx" ON "payload_schema"."posts" USING btree ("author_id");
  CREATE INDEX "posts_thumbnail_idx" ON "payload_schema"."posts" USING btree ("thumbnail_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "payload_schema"."posts" USING btree ("slug");
  CREATE INDEX "posts_updated_at_idx" ON "payload_schema"."posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "payload_schema"."posts" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "payload_schema"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload_schema"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload_schema"."media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "payload_schema"."media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "payload_schema"."media" USING btree ("sizes_card_filename");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_schema"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_schema"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_schema"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_schema"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_schema"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_schema"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_schema"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_schema"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_schema"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_schema"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_schema"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_schema"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_schema"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload_schema"."users_sessions" CASCADE;
  DROP TABLE "payload_schema"."users" CASCADE;
  DROP TABLE "payload_schema"."categories" CASCADE;
  DROP TABLE "payload_schema"."products" CASCADE;
  DROP TABLE "payload_schema"."products_rels" CASCADE;
  DROP TABLE "payload_schema"."posts" CASCADE;
  DROP TABLE "payload_schema"."media" CASCADE;
  DROP TABLE "payload_schema"."payload_locked_documents" CASCADE;
  DROP TABLE "payload_schema"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_schema"."payload_preferences" CASCADE;
  DROP TABLE "payload_schema"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload_schema"."payload_migrations" CASCADE;
  DROP TYPE "payload_schema"."enum_users_role";
  DROP TYPE "payload_schema"."enum_products_resolution";
  DROP TYPE "payload_schema"."enum_products_lens_type";
  DROP TYPE "payload_schema"."enum_products_night_vision_type";
  DROP TYPE "payload_schema"."enum_products_status";
  DROP TYPE "payload_schema"."enum_posts_status";`)
}
