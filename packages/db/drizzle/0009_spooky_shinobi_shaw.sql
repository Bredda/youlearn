ALTER TABLE "course_revision" ADD COLUMN "duration_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "course_revision" ADD COLUMN "certifying" boolean DEFAULT false NOT NULL;