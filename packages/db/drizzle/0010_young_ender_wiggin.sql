CREATE TYPE "public"."enrollment_status" AS ENUM('in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "chapter_progress" (
	"enrollment_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_progress_enrollment_id_chapter_id_pk" PRIMARY KEY("enrollment_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "enrollment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"course_id" text NOT NULL,
	"revision_id" text NOT NULL,
	"status" "enrollment_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"enrollment_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"final_exam" boolean DEFAULT false NOT NULL,
	"draw" jsonb NOT NULL,
	"answers" jsonb,
	"score" integer,
	"passed" boolean,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"submitted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment" ADD CONSTRAINT "enrollment_revision_id_course_revision_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."course_revision"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_enrollment_id_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_active_idx" ON "enrollment" USING btree ("user_id","course_id") WHERE "enrollment"."status" <> 'failed';--> statement-breakpoint
CREATE INDEX "enrollment_course_id_idx" ON "enrollment" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollment_revision_id_idx" ON "enrollment" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "quiz_attempt_enrollment_chapter_idx" ON "quiz_attempt" USING btree ("enrollment_id","chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempt_final_exam_idx" ON "quiz_attempt" USING btree ("enrollment_id") WHERE "quiz_attempt"."final_exam";