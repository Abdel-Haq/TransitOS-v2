CREATE TABLE "resource_assignment" (
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"actions" text[] NOT NULL,
	"inherit_shareable_children" boolean DEFAULT false NOT NULL,
	"valid_until" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "resource_grant_actions_not_empty" CHECK (cardinality("resource_grant"."actions") >= 1)
);
--> statement-breakpoint
CREATE TABLE "role_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_code" text NOT NULL,
	"scope" text DEFAULT 'assigned' NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "role_assignment_role_check" CHECK ("role_assignment"."role_code" IN ('access_admin', 'operations_manager', 'dossier_agent', 'declarant_reviewer', 'finance_operator', 'finance_reviewer', 'dispatcher', 'field_agent', 'red_operator', 'red_reviewer', 'production_contributor', 'rule_reviewer', 'auditor', 'platform_operator', 'external_contact', 'external_approver')),
	CONSTRAINT "role_assignment_scope_check" CHECK ("role_assignment"."scope" IN ('assigned', 'all_operational_records')),
	CONSTRAINT "role_assignment_window_check" CHECK ("role_assignment"."valid_until" IS NULL OR "role_assignment"."valid_until" > "role_assignment"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "user_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"display_name" text NOT NULL,
	"audience" text DEFAULT 'staff' NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_account_subject_unique" UNIQUE("subject")
);
--> statement-breakpoint
ALTER TABLE "resource_assignment" ADD CONSTRAINT "resource_assignment_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_assignment" ADD CONSTRAINT "resource_assignment_resource_id_resource_record_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_grant" ADD CONSTRAINT "resource_grant_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_grant" ADD CONSTRAINT "resource_grant_resource_id_resource_record_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resource_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignment" ADD CONSTRAINT "role_assignment_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "resource_assignment_unique" ON "resource_assignment" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX "resource_assignment_resource_idx" ON "resource_assignment" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resource_grant_user_idx" ON "resource_grant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resource_grant_live_idx" ON "resource_grant" USING btree ("user_id","resource_id") WHERE "resource_grant"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "role_assignment_active_unique" ON "role_assignment" USING btree ("user_id","role_code","scope") WHERE "role_assignment"."valid_until" IS NULL;--> statement-breakpoint
CREATE INDEX "role_assignment_user_idx" ON "role_assignment" USING btree ("user_id");