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

CREATE UNIQUE INDEX "organization_billing_subscriptions_organization_id_sku_key_key"
  ON "organization_billing_subscriptions"("organization_id", "sku_key");

CREATE UNIQUE INDEX "organization_billing_subscriptions_stripe_subscription_id_stripe_subscription_item_id_key"
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

ALTER TABLE "organization_billing_subscriptions"
  ADD CONSTRAINT "organization_billing_subscriptions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_usage_events"
  ADD CONSTRAINT "billing_usage_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_audit_events"
  ADD CONSTRAINT "billing_audit_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
