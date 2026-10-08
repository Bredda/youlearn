CREATE TYPE "public"."review_target_type" AS ENUM('revision', 'chapter', 'block', 'question');--> statement-breakpoint
CREATE TYPE "public"."review_thread_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "review_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"revision_id" text NOT NULL,
	"parent_id" text,
	"target_type" "review_target_type",
	"chapter_id" text,
	"item_id" text,
	"quote" text,
	"body" text NOT NULL,
	"author_id" text NOT NULL,
	"author_label" text NOT NULL,
	"status" "review_thread_status" DEFAULT 'open' NOT NULL,
	"resolved_by_id" text,
	"resolved_by_label" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_revision_id_course_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comment" ADD CONSTRAINT "review_comment_parent_id_review_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."review_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_comment_revision_id_idx" ON "review_comment" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "review_comment_parent_id_idx" ON "review_comment" USING btree ("parent_id");