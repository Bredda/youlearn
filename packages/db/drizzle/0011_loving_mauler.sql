CREATE TABLE "revision_reviewer" (
	"revision_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "revision_reviewer_revision_id_user_id_pk" PRIMARY KEY("revision_id","user_id")
);
--> statement-breakpoint
DROP INDEX "course_revision_active_status_idx";--> statement-breakpoint
ALTER TABLE "revision_reviewer" ADD CONSTRAINT "revision_reviewer_revision_id_course_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revision"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_reviewer" ADD CONSTRAINT "revision_reviewer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revision_reviewer_user_id_idx" ON "revision_reviewer" USING btree ("user_id");--> statement-breakpoint
DO $$
DECLARE
	conflicts text;
BEGIN
	SELECT string_agg(DISTINCT c.name, ', ') INTO conflicts
	FROM course_revision r
	JOIN course c ON c.id = r.course_id
	WHERE r.status IN ('draft', 'preview')
	AND r.course_id IN (
		SELECT course_id FROM course_revision
		WHERE status IN ('draft', 'preview')
		GROUP BY course_id HAVING count(*) > 1
	);
	IF conflicts IS NOT NULL THEN
		RAISE EXCEPTION 'A course can now have only one open revision (draft or preview), but these have both: %. Delete or publish one of them, then run the migration again.', conflicts;
	END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "course_revision_open_idx" ON "course_revision" USING btree ("course_id") WHERE "course_revision"."status" in ('draft', 'preview');--> statement-breakpoint
CREATE UNIQUE INDEX "course_revision_published_idx" ON "course_revision" USING btree ("course_id") WHERE "course_revision"."status" = 'published';