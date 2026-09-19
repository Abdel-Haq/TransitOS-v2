CREATE TABLE "policy_requirement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"scope_module" text NOT NULL,
	"label_fr" text NOT NULL,
	"schema" jsonb NOT NULL,
	"status" text DEFAULT 'unresolved' NOT NULL,
	"value" jsonb,
	"evidence_version_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"effective_from" date,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_requirement_status_check" CHECK ("policy_requirement"."status" IN ('unresolved', 'proposed', 'approved', 'superseded')),
	CONSTRAINT "policy_requirement_module_check" CHECK ("policy_requirement"."scope_module" IN ('FD01', 'FD02', 'FD03', 'CR01', 'CR02', 'CR03', 'CR04', 'CR05', 'CR06', 'CR07', 'PL01', 'PL02', 'DF01', 'DF02', 'DF03', 'DF04', 'DF05', 'DF06')),
	CONSTRAINT "policy_requirement_key_shape" CHECK ("policy_requirement"."key" ~ '^policy\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
	CONSTRAINT "policy_requirement_approved_is_complete" CHECK ("policy_requirement"."status" <> 'approved' OR ("policy_requirement"."value" IS NOT NULL AND "policy_requirement"."approved_by" IS NOT NULL AND "policy_requirement"."approved_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "reviewer_qualification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"scope_codes" text[] NOT NULL,
	"evidence_version_id" uuid,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"verified_by" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviewer_qualification_scope_not_empty" CHECK (cardinality("reviewer_qualification"."scope_codes") >= 1),
	CONSTRAINT "reviewer_qualification_window_check" CHECK ("reviewer_qualification"."valid_until" IS NULL OR "reviewer_qualification"."valid_until" > "reviewer_qualification"."valid_from"),
	CONSTRAINT "reviewer_qualification_not_self" CHECK ("reviewer_qualification"."verified_by" <> "reviewer_qualification"."user_id")
);
--> statement-breakpoint
CREATE TABLE "rule_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"description_fr" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_definition_category_check" CHECK ("rule_definition"."category" IN ('eligibility', 'documents', 'valuation', 'tax', 'deadline', 'disposition', 'rounding', 'contract', 'closure'))
);
--> statement-breakpoint
CREATE TABLE "rule_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_definition_id" uuid NOT NULL,
	"version_label" text NOT NULL,
	"source_document_version_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"publication_date" date,
	"effective_from" date NOT NULL,
	"effective_until" date,
	"jurisdiction_code" text NOT NULL,
	"regime_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"operation_codes" text[] DEFAULT '{}'::text[] NOT NULL,
	"predicate" jsonb NOT NULL,
	"predicate_schema_version" text DEFAULT 'predicate.v1' NOT NULL,
	"effect" jsonb NOT NULL,
	"effect_schema_version" text DEFAULT 'effect.v1' NOT NULL,
	"interpretation_fr" text NOT NULL,
	"uncertainties_fr" text[] DEFAULT '{}'::text[] NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"approval_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rule_version_state_check" CHECK ("rule_version"."state" IN ('draft', 'in_review', 'approved', 'active', 'superseded', 'rejected')),
	CONSTRAINT "rule_version_window_check" CHECK ("rule_version"."effective_until" IS NULL OR "rule_version"."effective_until" >= "rule_version"."effective_from"),
	CONSTRAINT "rule_version_approved_has_decision" CHECK ("rule_version"."state" NOT IN ('approved', 'active') OR "rule_version"."approval_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "policy_requirement" ADD CONSTRAINT "policy_requirement_approved_by_user_account_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_qualification" ADD CONSTRAINT "reviewer_qualification_user_id_user_account_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_qualification" ADD CONSTRAINT "reviewer_qualification_verified_by_user_account_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_definition" ADD CONSTRAINT "rule_definition_owner_user_id_user_account_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_version" ADD CONSTRAINT "rule_version_rule_definition_id_rule_definition_id_fk" FOREIGN KEY ("rule_definition_id") REFERENCES "public"."rule_definition"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "policy_requirement_key_unique" ON "policy_requirement" USING btree ("key");--> statement-breakpoint
CREATE INDEX "policy_requirement_status_idx" ON "policy_requirement" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviewer_qualification_user_idx" ON "reviewer_qualification" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_definition_code_unique" ON "rule_definition" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_version_label_unique" ON "rule_version" USING btree ("rule_definition_id","version_label");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_version_one_active" ON "rule_version" USING btree ("rule_definition_id") WHERE "rule_version"."state" = 'active';--> statement-breakpoint
CREATE INDEX "rule_version_effective_idx" ON "rule_version" USING btree ("effective_from","effective_until");--> statement-breakpoint
-- `14-DF04-rules.md:18` — "source-backed version immutable after approval", and
-- `CLAUDE.md` non-negotiable #5: approved rules are corrected by a new version, never by
-- update.
--
-- Enforced here rather than in the application. A rule the application enforces is a rule
-- one forgotten code path breaks, and the whole value of an approved rule version is that
-- a calculation run years later can be replayed against exactly what was approved.
--
-- Lifecycle metadata stays mutable: `:26` allows active→superseded, and `20-…:13` says
-- "Approved rule/BOM/contract content is immutable even if its lifecycle metadata later
-- becomes superseded." So state, approval_id and updated_at may change; content may not.
CREATE OR REPLACE FUNCTION rule_version_content_is_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD.state IN ('approved', 'active', 'superseded') THEN
    IF NEW.rule_definition_id IS DISTINCT FROM OLD.rule_definition_id
       OR NEW.version_label IS DISTINCT FROM OLD.version_label
       OR NEW.source_document_version_ids IS DISTINCT FROM OLD.source_document_version_ids
       OR NEW.publication_date IS DISTINCT FROM OLD.publication_date
       OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
       OR NEW.effective_until IS DISTINCT FROM OLD.effective_until
       OR NEW.jurisdiction_code IS DISTINCT FROM OLD.jurisdiction_code
       OR NEW.regime_codes IS DISTINCT FROM OLD.regime_codes
       OR NEW.operation_codes IS DISTINCT FROM OLD.operation_codes
       OR NEW.predicate IS DISTINCT FROM OLD.predicate
       OR NEW.effect IS DISTINCT FROM OLD.effect
       OR NEW.interpretation_fr IS DISTINCT FROM OLD.interpretation_fr
       OR NEW.uncertainties_fr IS DISTINCT FROM OLD.uncertainties_fr
    THEN
      RAISE EXCEPTION
        'rule_version % is %; approved content is corrected by a new version, never by update',
        OLD.id, OLD.state
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER rule_version_immutable_after_approval
  BEFORE UPDATE ON rule_version
  FOR EACH ROW EXECUTE FUNCTION rule_version_content_is_immutable();
--> statement-breakpoint
-- The same rule for an approved policy value. `00-shared-contract.md:119` — "Only
-- approved versioned values are usable"; an approved value that can be edited in place is
-- a value nobody actually approved.
CREATE OR REPLACE FUNCTION policy_requirement_value_is_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'approved' THEN
    IF NEW.value IS DISTINCT FROM OLD.value
       OR NEW.key IS DISTINCT FROM OLD.key
       OR NEW.schema IS DISTINCT FROM OLD.schema
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
    THEN
      RAISE EXCEPTION
        'policy_requirement % is approved; supersede it instead of editing the value',
        OLD.key
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER policy_requirement_immutable_after_approval
  BEFORE UPDATE ON policy_requirement
  FOR EACH ROW EXECUTE FUNCTION policy_requirement_value_is_immutable();
