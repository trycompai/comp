-- CreateTable
CREATE TABLE "public"."EvidenceAutomation" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('aut'::text),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRunAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "EvidenceAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EvidenceAutomation_organizationId_idx" ON "public"."EvidenceAutomation"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomation" ADD CONSTRAINT "EvidenceAutomation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvidenceAutomation" ADD CONSTRAINT "EvidenceAutomation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
