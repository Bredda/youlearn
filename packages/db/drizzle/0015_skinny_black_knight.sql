CREATE TYPE "public"."revision_change_impact" AS ENUM('minor', 'major');--> statement-breakpoint
ALTER TABLE "course_revision" ADD COLUMN "change_impact" "revision_change_impact";