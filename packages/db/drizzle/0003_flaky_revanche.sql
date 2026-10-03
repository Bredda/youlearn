CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"actor_id" text,
	"actor_label" text,
	"target_type" text,
	"target_id" text,
	"target_label" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "event_created_at_idx" ON "event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_type_created_at_idx" ON "event" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "event_target_idx" ON "event" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "event_actor_id_idx" ON "event" USING btree ("actor_id");