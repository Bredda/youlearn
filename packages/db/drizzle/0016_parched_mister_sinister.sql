ALTER TYPE "public"."enrollment_status" ADD VALUE 'superseded';--> statement-breakpoint
DROP INDEX "enrollment_active_idx";--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "previous_enrollment_id" text;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "update_postponed_revision_id" text;--> statement-breakpoint
ALTER TABLE "enrollment" ADD COLUMN "notice_acked_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_previous_enrollment_id_enrollment_id_fk" FOREIGN KEY ("previous_enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_update_postponed_revision_id_course_revision_id_fk" FOREIGN KEY ("update_postponed_revision_id") REFERENCES "public"."course_revision"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_active_idx" ON "enrollment" USING btree ("user_id","course_id") WHERE "enrollment"."status" in ('in_progress', 'completed');