-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM (
  'invited',
  'in_progress',
  'in_review',
  'completed',
  'completed_with_flags',
  'failed',
  'cancelled'
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "organization_billing" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('obil'::text),
  "organization_id" TEXT NOT NULL,
  "stripe_customer_id" TEXT NOT NULL,
  "stripe_background_check_payment_method_id" TEXT,
  "background_check_payment_method_setup_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_billing_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "organization_billing"
ADD COLUMN IF NOT EXISTS "stripe_background_check_payment_method_id" TEXT,
ADD COLUMN IF NOT EXISTS "background_check_payment_method_setup_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "organization_billing_organization_id_key" ON "organization_billing"("organization_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organization_billing_organization_id_fkey'
  ) THEN
    ALTER TABLE "organization_billing"
    ADD CONSTRAINT "organization_billing_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "background_check_requests" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bcr'::text),
  "organizationId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "employeeEmail" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "identityBackgroundCheckId" TEXT,
  "candidateUrl" TEXT,
  "status" "BackgroundCheckStatus" NOT NULL DEFAULT 'invited',
  "identityStatus" TEXT,
  "employmentStatus" TEXT,
  "referenceStatus" TEXT,
  "rightToWorkStatus" TEXT,
  "adjudicationStatus" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripePaymentStatus" TEXT,
  "stripeRefundId" TEXT,
  "stripeAmountCents" INTEGER,
  "stripeCurrency" TEXT,
  "lastWebhookEventId" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "background_check_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_check_webhook_events" (
  "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bcw'::text),
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "backgroundCheckRequestId" TEXT,
  "identityBackgroundCheckId" TEXT,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "background_check_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "background_check_requests_identityBackgroundCheckId_key" ON "background_check_requests"("identityBackgroundCheckId");

-- CreateIndex
CREATE UNIQUE INDEX "background_check_requests_organizationId_memberId_key" ON "background_check_requests"("organizationId", "memberId");

-- CreateIndex
CREATE INDEX "background_check_requests_organizationId_idx" ON "background_check_requests"("organizationId");

-- CreateIndex
CREATE INDEX "background_check_requests_memberId_idx" ON "background_check_requests"("memberId");

-- CreateIndex
CREATE INDEX "background_check_requests_status_idx" ON "background_check_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "background_check_webhook_events_eventId_key" ON "background_check_webhook_events"("eventId");

-- CreateIndex
CREATE INDEX "background_check_webhook_events_backgroundCheckRequestId_idx" ON "background_check_webhook_events"("backgroundCheckRequestId");

-- CreateIndex
CREATE INDEX "background_check_webhook_events_identityBackgroundCheckId_idx" ON "background_check_webhook_events"("identityBackgroundCheckId");

-- AddForeignKey
ALTER TABLE "background_check_requests" ADD CONSTRAINT "background_check_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_check_requests" ADD CONSTRAINT "background_check_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "background_check_webhook_events" ADD CONSTRAINT "background_check_webhook_events_backgroundCheckRequestId_fkey" FOREIGN KEY ("backgroundCheckRequestId") REFERENCES "background_check_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
