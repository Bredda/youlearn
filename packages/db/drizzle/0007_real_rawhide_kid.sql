ALTER TABLE "course_revision" ADD COLUMN "preview_token" text;--> statement-breakpoint
ALTER TABLE "course_revision" ADD CONSTRAINT "course_revision_previewToken_unique" UNIQUE("preview_token");