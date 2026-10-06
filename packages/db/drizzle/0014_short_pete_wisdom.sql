CREATE TYPE "public"."review_verdict" AS ENUM('approved', 'changes_requested');--> statement-breakpoint
ALTER TABLE "revision_reviewer" ADD COLUMN "verdict" "review_verdict";--> statement-breakpoint
ALTER TABLE "revision_reviewer" ADD COLUMN "verdict_at" timestamp;--> statement-breakpoint
ALTER TABLE "revision_reviewer" ADD COLUMN "verdict_revision_updated_at" timestamp;