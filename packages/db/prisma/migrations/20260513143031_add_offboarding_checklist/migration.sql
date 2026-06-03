-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'offboarding_checklist';

-- CreateTable
CREATE TABLE "OffboardingChecklistTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('oct'::text),
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OffboardingChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffboardingChecklistCompletion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('occ'::text),
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "completedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "OffboardingChecklistCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OffboardingChecklistTemplate_organizationId_idx" ON "OffboardingChecklistTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "OffboardingChecklistTemplate_organizationId_isEnabled_idx" ON "OffboardingChecklistTemplate"("organizationId", "isEnabled");

-- CreateIndex
CREATE INDEX "OffboardingChecklistCompletion_organizationId_idx" ON "OffboardingChecklistCompletion"("organizationId");

-- CreateIndex
CREATE INDEX "OffboardingChecklistCompletion_memberId_idx" ON "OffboardingChecklistCompletion"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "OffboardingChecklistCompletion_memberId_templateItemId_key" ON "OffboardingChecklistCompletion"("memberId", "templateItemId");

-- AddForeignKey
ALTER TABLE "OffboardingChecklistTemplate" ADD CONSTRAINT "OffboardingChecklistTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "OffboardingChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
