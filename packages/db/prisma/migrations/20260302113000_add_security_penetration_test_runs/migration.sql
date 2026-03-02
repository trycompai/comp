-- CreateTable
CREATE TABLE "public"."security_penetration_test_runs" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('ptr'::text),
    "organization_id" TEXT NOT NULL,
    "provider_run_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_penetration_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_penetration_test_runs_provider_run_id_key" ON "public"."security_penetration_test_runs"("provider_run_id");

-- CreateIndex
CREATE INDEX "security_penetration_test_runs_organization_id_idx" ON "public"."security_penetration_test_runs"("organization_id");

-- AddForeignKey
ALTER TABLE "public"."security_penetration_test_runs" ADD CONSTRAINT "security_penetration_test_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
