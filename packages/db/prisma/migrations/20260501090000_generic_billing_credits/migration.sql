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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

ALTER TABLE "billing_credit_balances"
    ADD CONSTRAINT "billing_credit_balances_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credit_events"
    ADD CONSTRAINT "billing_credit_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credit_events"
    ADD CONSTRAINT "billing_credit_events_balance_id_fkey"
    FOREIGN KEY ("balance_id") REFERENCES "billing_credit_balances"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

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
