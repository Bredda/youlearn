CREATE TABLE "course_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"sha256" text NOT NULL,
	"content_type" text NOT NULL,
	"size" bigint NOT NULL,
	"filename" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "image_asset_id" text;--> statement-breakpoint
ALTER TABLE "course_revision" ADD COLUMN "content" jsonb DEFAULT '{"version":1,"lessons":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "course_asset" ADD CONSTRAINT "course_asset_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_asset_hash_idx" ON "course_asset" USING btree ("course_id","sha256");--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_image_asset_id_course_asset_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."course_asset"("id") ON DELETE set null ON UPDATE no action;