CREATE TABLE "form_notifications" (
	"site_id" uuid NOT NULL,
	"form_name" text DEFAULT '' NOT NULL,
	"email" text,
	"webhook_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_notifications_site_id_form_name_pk" PRIMARY KEY("site_id","form_name")
);
--> statement-breakpoint
ALTER TABLE "form_notifications" ADD CONSTRAINT "form_notifications_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;