CREATE TYPE "public"."revision_status" AS ENUM('draft', 'preview', 'published', 'deprecated');--> statement-breakpoint
CREATE TABLE "course_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"course_id" text NOT NULL,
	"key" text NOT NULL,
	"status" "revision_status" DEFAULT 'draft' NOT NULL,
	"parent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revision_contributor" (
	"revision_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revision_contributor_revision_id_user_id_pk" PRIMARY KEY("revision_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "course" DROP CONSTRAINT "course_slug_unique";--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_revision" ADD CONSTRAINT "course_revision_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_revision" ADD CONSTRAINT "course_revision_parent_id_course_revision_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."course_revision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_contributor" ADD CONSTRAINT "revision_contributor_revision_id_course_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_revision_key_idx" ON "course_revision" USING btree ("course_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "course_revision_active_status_idx" ON "course_revision" USING btree ("course_id","status") WHERE "course_revision"."status" <> 'deprecated';--> statement-breakpoint
CREATE UNIQUE INDEX "course_slug_idx" ON "course" USING btree ("slug") WHERE "course"."deleted_at" is null;