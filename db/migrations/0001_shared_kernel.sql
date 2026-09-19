CREATE TABLE "approval_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"reviewer_capability" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"bound_digest" text NOT NULL,
	"consumed_effect_id" uuid,
	"self_approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	CONSTRAINT "approval_decision_decision_check" CHECK ("approval_decision"."decision" IN ('approved', 'rejected', 'changes_requested')),
	CONSTRAINT "approval_decision_digest_check" CHECK ("approval_decision"."bound_digest" ~ '^sha256:[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action_code" text NOT NULL,
	"resource_kind" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" uuid NOT NULL,
	"before_digest" text,
	"after_digest" text,
	"changed_paths" text[] DEFAULT '{}'::text[] NOT NULL,
	"reason" text,
	CONSTRAINT "audit_event_kind_check" CHECK ("audit_event"."resource_kind" IN ('counterparty', 'dossier', 'declaration_version', 'blocker', 'client_request', 'cost_item', 'delivery_order', 'red_project', 'import_lot', 'export_flow', 'allocation_proposal', 'ledger_transaction', 'bom_version', 'production_batch', 'production_reconciliation', 'rule_version', 'evidence_version', 'review_request', 'approval_decision', 'obligation', 'guarantee_request', 'external_observation', 'resource_evidence', 'kernel_probe'))
);
--> statement-breakpoint
CREATE TABLE "idempotency_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal_id" uuid NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"key" text NOT NULL,
	"request_digest" text NOT NULL,
	"state" text DEFAULT 'in_progress' NOT NULL,
	"result_status" integer,
	"result_body" jsonb,
	"resource_kind" text,
	"resource_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "idempotency_state_check" CHECK ("idempotency_record"."state" IN ('in_progress', 'completed')),
	CONSTRAINT "idempotency_digest_check" CHECK ("idempotency_record"."request_digest" ~ '^sha256:[0-9a-f]{64}$'),
	CONSTRAINT "idempotency_completed_has_status" CHECK (("idempotency_record"."state" = 'completed') = ("idempotency_record"."result_status" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handler_type" text NOT NULL,
	"payload_schema" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"lease_owner" text,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_code" text,
	"result_kind" text,
	"result_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "job_status_check" CHECK ("job"."status" IN ('pending', 'leased', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "job_attempts_check" CHECK ("job"."attempts" >= 0),
	CONSTRAINT "job_lease_consistent" CHECK (("job"."lease_owner" IS NULL) = ("job"."lease_until" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "outbox_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_kind" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload_schema" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "outbox_kind_check" CHECK ("outbox_event"."aggregate_kind" IN ('counterparty', 'dossier', 'declaration_version', 'blocker', 'client_request', 'cost_item', 'delivery_order', 'red_project', 'import_lot', 'export_flow', 'allocation_proposal', 'ledger_transaction', 'bom_version', 'production_batch', 'production_reconciliation', 'rule_version', 'evidence_version', 'review_request', 'approval_decision', 'obligation', 'guarantee_request', 'external_observation', 'resource_evidence', 'kernel_probe'))
);
--> statement-breakpoint
CREATE TABLE "resource_record" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"parent_id" uuid,
	"counterparty_id" uuid,
	"classification" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "resource_record_kind_check" CHECK ("resource_record"."kind" IN ('counterparty', 'dossier', 'declaration_version', 'blocker', 'client_request', 'cost_item', 'delivery_order', 'red_project', 'import_lot', 'export_flow', 'allocation_proposal', 'ledger_transaction', 'bom_version', 'production_batch', 'production_reconciliation', 'rule_version', 'evidence_version', 'review_request', 'approval_decision', 'obligation', 'guarantee_request', 'external_observation', 'resource_evidence', 'kernel_probe')),
	CONSTRAINT "resource_record_classification_check" CHECK ("resource_record"."classification" IN ('internal', 'client_shareable', 'restricted')),
	CONSTRAINT "resource_record_parent_not_self" CHECK ("resource_record"."parent_id" IS DISTINCT FROM "resource_record"."id")
);
--> statement-breakpoint
CREATE TABLE "review_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"action_code" text NOT NULL,
	"payload_snapshot" jsonb NOT NULL,
	"payload_digest" text NOT NULL,
	"reviewer_capability" text NOT NULL,
	"submitted_by" uuid NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "review_request_kind_check" CHECK ("review_request"."target_kind" IN ('counterparty', 'dossier', 'declaration_version', 'blocker', 'client_request', 'cost_item', 'delivery_order', 'red_project', 'import_lot', 'export_flow', 'allocation_proposal', 'ledger_transaction', 'bom_version', 'production_batch', 'production_reconciliation', 'rule_version', 'evidence_version', 'review_request', 'approval_decision', 'obligation', 'guarantee_request', 'external_observation', 'resource_evidence', 'kernel_probe')),
	CONSTRAINT "review_request_state_check" CHECK ("review_request"."state" IN ('draft', 'submitted', 'decided', 'cancelled', 'stale')),
	CONSTRAINT "review_request_digest_check" CHECK ("review_request"."payload_digest" ~ '^sha256:[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "kernel_probe" (
	"id" uuid PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"amount" numeric NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "kernel_probe_state_check" CHECK ("kernel_probe"."state" IN ('draft', 'posted', 'reversed'))
);
--> statement-breakpoint
ALTER TABLE "approval_decision" ADD CONSTRAINT "approval_decision_request_id_review_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."review_request"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_request" ADD CONSTRAINT "review_request_target_id_resource_record_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."resource_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kernel_probe" ADD CONSTRAINT "kernel_probe_id_resource_record_id_fk" FOREIGN KEY ("id") REFERENCES "public"."resource_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "approval_decision_one_per_capability" ON "approval_decision" USING btree ("request_id","reviewer_capability");--> statement-breakpoint
CREATE INDEX "approval_decision_unconsumed_idx" ON "approval_decision" USING btree ("request_id") WHERE "approval_decision"."consumed_effect_id" IS NULL;--> statement-breakpoint
CREATE INDEX "approval_decision_self_approved_idx" ON "approval_decision" USING btree ("decided_at") WHERE "approval_decision"."self_approved" = true;--> statement-breakpoint
CREATE INDEX "audit_event_resource_idx" ON "audit_event" USING btree ("resource_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_event_request_idx" ON "audit_event" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "audit_event_actor_idx" ON "audit_event" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_unique" ON "idempotency_record" USING btree ("principal_id","method","path","key");--> statement-breakpoint
CREATE UNIQUE INDEX "job_dedupe_key_unique" ON "job" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "job_claim_idx" ON "job" USING btree ("next_attempt_at") WHERE "job"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "outbox_unprocessed_idx" ON "outbox_event" USING btree ("occurred_at") WHERE "outbox_event"."processed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "outbox_aggregate_idx" ON "outbox_event" USING btree ("aggregate_id");--> statement-breakpoint
CREATE INDEX "resource_record_parent_idx" ON "resource_record" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "resource_record_counterparty_idx" ON "resource_record" USING btree ("counterparty_id");--> statement-breakpoint
CREATE INDEX "resource_record_kind_idx" ON "resource_record" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "review_request_target_idx" ON "review_request" USING btree ("target_id","action_code");--> statement-breakpoint
CREATE INDEX "review_request_state_idx" ON "review_request" USING btree ("state");