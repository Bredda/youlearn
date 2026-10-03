ALTER TABLE "course_revision" ALTER COLUMN "content" SET DEFAULT '{"version":2,"chapters":[]}'::jsonb;--> statement-breakpoint
-- Content v1 (lessons) is not carried over: nothing worth keeping existed when the shape changed.
UPDATE "course_revision" SET "content" = '{"version":2,"chapters":[]}'::jsonb;--> statement-breakpoint
-- The default only backfills existing rows: new revisions must state their purpose.
ALTER TABLE "course_revision" ADD COLUMN "purpose" text NOT NULL DEFAULT 'Révision initiale';--> statement-breakpoint
ALTER TABLE "course_revision" ALTER COLUMN "purpose" DROP DEFAULT;
