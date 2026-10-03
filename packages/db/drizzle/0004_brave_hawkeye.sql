CREATE TABLE "course" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"categories" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "course_group" (
	"course_id" text NOT NULL,
	"group_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_group_course_id_group_id_pk" PRIMARY KEY("course_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "group" ADD COLUMN "system" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "course_group" ADD CONSTRAINT "course_group_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_group" ADD CONSTRAINT "course_group_group_id_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."group"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_categories_idx" ON "course" USING gin ("categories");--> statement-breakpoint
CREATE INDEX "course_group_group_id_idx" ON "course_group" USING btree ("group_id");