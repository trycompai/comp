-- CreateTable
CREATE TABLE "organization_billing" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('obil'::text),
    "organization_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pentest_subscriptions" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('psub'::text),
    "organization_id" TEXT NOT NULL,
    "organization_billing_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "stripe_overage_price_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "included_runs_per_period" INTEGER NOT NULL DEFAULT 3,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pentest_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_billing_organization_id_key" ON "organization_billing"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pentest_subscriptions_organization_id_key" ON "pentest_subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pentest_subscriptions_organization_billing_id_key" ON "pentest_subscriptions"("organization_billing_id");

-- CreateIndex
CREATE INDEX "pentest_subscriptions_organization_id_idx" ON "pentest_subscriptions"("organization_id");

-- AddForeignKey
ALTER TABLE "organization_billing" ADD CONSTRAINT "organization_billing_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pentest_subscriptions" ADD CONSTRAINT "pentest_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pentest_subscriptions" ADD CONSTRAINT "pentest_subscriptions_organization_billing_id_fkey" FOREIGN KEY ("organization_billing_id") REFERENCES "organization_billing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
