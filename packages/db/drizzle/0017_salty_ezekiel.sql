ALTER TABLE "course_revision" ADD COLUMN "published_at" timestamp;--> statement-breakpoint
-- Existing revisions: only their order matters. A deprecated revision was deprecated by the publication of the next
-- one, so its `updated_at` sorts the deprecated ones in publication order; the published one comes after them.
UPDATE "course_revision" SET "published_at" = "updated_at" WHERE "status" = 'deprecated';
--> statement-breakpoint
UPDATE "course_revision" SET "published_at" = "updated_at" + interval '1 millisecond' WHERE "status" = 'published';
