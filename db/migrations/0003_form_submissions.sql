CREATE TABLE "form_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"form_name" text NOT NULL,
	"data" jsonb NOT NULL,
	"user_agent" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_submissions_site_idx" ON "form_submissions" USING btree ("site_id","created_at");