ALTER TABLE "organization_billing"
  RENAME COLUMN "stripe_background_check_payment_method_id" TO "stripe_payment_method_id";

ALTER TABLE "organization_billing"
  RENAME COLUMN "background_check_payment_method_setup_at" TO "payment_method_updated_at";

CREATE TABLE "organization_billing_subscriptions" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('obs'::text),
  "organization_id" TEXT NOT NULL,
  "sku_key" TEXT NOT NULL,
  "stripe_subscription_id" TEXT NOT NULL,
  "stripe_subscription_item_id" TEXT NOT NULL,
  "stripe_price_id" TEXT NOT NULL,
  "stripe_status" TEXT NOT NULL,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "included_quantity" INTEGER NOT NULL,
  "used_quantity" INTEGER NOT NULL DEFAULT 0,
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "canceled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_usage_events" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bue'::text),
  "organization_id" TEXT NOT NULL,
  "sku_key" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "source_resource_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "stripe_event_id" TEXT,
  "stripe_invoice_id" TEXT,
  "stripe_subscription_item_id" TEXT,
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_usage_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stripe_webhook_events" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('swe'::text),
  "stripe_event_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processed',
  "error" TEXT,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_audit_events" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bae'::text),
  "organization_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "sku_key" TEXT,
  "stripe_event_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_audit_events_pkey" PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "pentest_subscriptions";

ALTER TABLE "security_penetration_test_runs"
  ADD COLUMN "billing_usage_source_id" TEXT;

-- Remove the old customer-facing one-free-pentest-run balance now that
-- add-ons use Stripe subscription trials. Keep lifetime grant history intact;
-- this only removes one spendable wallet credit from each org that still has
-- one available.
UPDATE "pentest_credits"
SET
  "balance" = GREATEST("balance" - 1, 0),
  "last_grant_source" = CASE
    WHEN "last_grant_source" = 'trial' THEN 'migration_remove_trial'
    ELSE "last_grant_source"
  END,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "balance" > 0;

CREATE TABLE "billing_credit_balances" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bcb'::text),
  "organization_id" TEXT NOT NULL,
  "product_key" TEXT NOT NULL,
  "sku_key" TEXT,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "total_granted" INTEGER NOT NULL DEFAULT 0,
  "total_consumed" INTEGER NOT NULL DEFAULT 0,
  "total_refunded" INTEGER NOT NULL DEFAULT 0,
  "last_source" TEXT NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "billing_credit_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_credit_balances_balance_check" CHECK ("balance" >= 0),
  CONSTRAINT "billing_credit_balances_total_granted_check" CHECK ("total_granted" >= 0),
  CONSTRAINT "billing_credit_balances_total_consumed_check" CHECK ("total_consumed" >= 0),
  CONSTRAINT "billing_credit_balances_total_refunded_check" CHECK ("total_refunded" >= 0)
);

CREATE TABLE "billing_credit_events" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bce'::text),
  "organization_id" TEXT NOT NULL,
  "balance_id" TEXT NOT NULL,
  "product_key" TEXT NOT NULL,
  "sku_key" TEXT,
  "event_type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "note" TEXT,
  "admin_user_id" TEXT,
  "source_resource_id" TEXT,
  "linked_event_id" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "billing_credit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_credit_events_quantity_check" CHECK ("quantity" > 0)
);

CREATE UNIQUE INDEX "organization_billing_subscriptions_organization_id_sku_key_key"
  ON "organization_billing_subscriptions"("organization_id", "sku_key");

CREATE UNIQUE INDEX "org_billing_subs_stripe_sub_item_key"
  ON "organization_billing_subscriptions"("stripe_subscription_id", "stripe_subscription_item_id");

CREATE INDEX "organization_billing_subscriptions_organization_id_idx"
  ON "organization_billing_subscriptions"("organization_id");

CREATE INDEX "organization_billing_subscriptions_stripe_subscription_id_idx"
  ON "organization_billing_subscriptions"("stripe_subscription_id");

CREATE INDEX "organization_billing_subscriptions_sku_key_idx"
  ON "organization_billing_subscriptions"("sku_key");

CREATE UNIQUE INDEX "billing_usage_events_idempotency_key_key"
  ON "billing_usage_events"("idempotency_key");

CREATE INDEX "billing_usage_events_organization_id_sku_key_idx"
  ON "billing_usage_events"("organization_id", "sku_key");

CREATE INDEX "billing_usage_events_stripe_event_id_idx"
  ON "billing_usage_events"("stripe_event_id");

CREATE INDEX "billing_usage_events_stripe_invoice_id_idx"
  ON "billing_usage_events"("stripe_invoice_id");

CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key"
  ON "stripe_webhook_events"("stripe_event_id");

CREATE INDEX "stripe_webhook_events_event_type_idx"
  ON "stripe_webhook_events"("event_type");

CREATE INDEX "stripe_webhook_events_status_idx"
  ON "stripe_webhook_events"("status");

CREATE INDEX "billing_audit_events_organization_id_idx"
  ON "billing_audit_events"("organization_id");

CREATE INDEX "billing_audit_events_stripe_event_id_idx"
  ON "billing_audit_events"("stripe_event_id");

CREATE INDEX "billing_audit_events_sku_key_idx"
  ON "billing_audit_events"("sku_key");

CREATE UNIQUE INDEX "billing_credit_balances_organization_id_product_key_sku_key_key"
  ON "billing_credit_balances"("organization_id", "product_key", COALESCE("sku_key", ''));

CREATE INDEX "billing_credit_balances_organization_id_product_key_idx"
  ON "billing_credit_balances"("organization_id", "product_key");

CREATE UNIQUE INDEX "billing_credit_events_idempotency_key_key"
  ON "billing_credit_events"("idempotency_key");

CREATE INDEX "billing_credit_events_organization_id_product_key_idx"
  ON "billing_credit_events"("organization_id", "product_key");

CREATE INDEX "billing_credit_events_source_resource_id_idx"
  ON "billing_credit_events"("source_resource_id");

CREATE INDEX "billing_credit_events_linked_event_id_idx"
  ON "billing_credit_events"("linked_event_id");

ALTER TABLE "organization_billing_subscriptions"
  ADD CONSTRAINT "organization_billing_subscriptions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_usage_events"
  ADD CONSTRAINT "billing_usage_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_audit_events"
  ADD CONSTRAINT "billing_audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credit_balances"
  ADD CONSTRAINT "billing_credit_balances_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credit_events"
  ADD CONSTRAINT "billing_credit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credit_events"
  ADD CONSTRAINT "billing_credit_events_balance_id_fkey"
  FOREIGN KEY ("balance_id") REFERENCES "billing_credit_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "billing_credit_balances" (
  "organization_id",
  "product_key",
  "sku_key",
  "balance",
  "total_granted",
  "total_consumed",
  "last_source",
  "created_at",
  "updated_at"
)
SELECT
  "organization_id",
  'pentest',
  NULL,
  "balance",
  "total_granted",
  "total_consumed",
  "last_grant_source",
  "created_at",
  "updated_at"
FROM "pentest_credits"
ON CONFLICT DO NOTHING;

INSERT INTO "billing_credit_events" (
  "organization_id",
  "balance_id",
  "product_key",
  "event_type",
  "quantity",
  "source",
  "note",
  "idempotency_key",
  "created_at"
)
SELECT
  balance."organization_id",
  balance."id",
  'pentest',
  'migration',
  GREATEST(balance."total_granted", 1),
  'pentest_credits_migration',
  'Backfilled from legacy pentest credit wallet',
  CONCAT('migration:pentest-credits:', balance."organization_id"),
  CURRENT_TIMESTAMP
FROM "billing_credit_balances" balance
WHERE balance."product_key" = 'pentest'
  AND balance."total_granted" > 0
ON CONFLICT DO NOTHING;
