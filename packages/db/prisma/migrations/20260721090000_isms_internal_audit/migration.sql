-- CreateEnum
CREATE TYPE "IsmsAuditStatus" AS ENUM ('planned', 'in_progress', 'complete');

-- CreateEnum
CREATE TYPE "IsmsAuditConclusionVerdict" AS ENUM ('conform', 'substantially_conform', 'not_yet_conform');

-- CreateEnum
CREATE TYPE "IsmsAuditControlResult" AS ENUM ('conformity_confirmed', 'nonconformity_raised', 'observation_raised', 'not_sampled');

-- CreateEnum
CREATE TYPE "IsmsAuditFindingType" AS ENUM ('nc_major', 'nc_minor', 'ofi', 'observation');

-- CreateEnum
CREATE TYPE "IsmsAuditFindingStatus" AS ENUM ('open', 'in_progress', 'closed');

-- AlterEnum
ALTER TYPE "IsmsDocumentType" ADD VALUE 'internal_audit';

-- CreateTable
CREATE TABLE "IsmsAudit" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_aud'::text),
    "documentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "auditorName" TEXT,
    "plannedStartDate" DATE,
    "plannedEndDate" DATE,
    "status" "IsmsAuditStatus" NOT NULL DEFAULT 'planned',
    "conclusionVerdict" "IsmsAuditConclusionVerdict",
    "conclusionNotes" TEXT,
    "signoffAuditorName" TEXT,
    "signoffAuditorDate" DATE,
    "signoffSpoName" TEXT,
    "signoffSpoDate" DATE,
    "signoffTopMgmtName" TEXT,
    "signoffTopMgmtDate" DATE,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsAuditControl" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ac'::text),
    "auditId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "controlKey" TEXT,
    "controlRef" TEXT NOT NULL,
    "whatWasTested" TEXT NOT NULL,
    "whereToFind" TEXT NOT NULL,
    "result" "IsmsAuditControlResult",
    "notes" TEXT,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsAuditControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsAuditFinding" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_af'::text),
    "auditId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "IsmsAuditFindingType" NOT NULL,
    "controlId" TEXT,
    "clauseOrControl" TEXT,
    "description" TEXT NOT NULL,
    "ownerMemberId" TEXT,
    "dueDate" DATE,
    "status" "IsmsAuditFindingStatus" NOT NULL DEFAULT 'open',
    "closureEvidence" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsAuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsAudit_documentId_idx" ON "IsmsAudit"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsAudit_documentId_reference_key" ON "IsmsAudit"("documentId", "reference");

-- CreateIndex
CREATE INDEX "IsmsAuditControl_auditId_idx" ON "IsmsAuditControl"("auditId");

-- CreateIndex
CREATE INDEX "IsmsAuditControl_documentId_idx" ON "IsmsAuditControl"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsAuditControl_auditId_controlKey_key" ON "IsmsAuditControl"("auditId", "controlKey");

-- CreateIndex
CREATE INDEX "IsmsAuditFinding_auditId_idx" ON "IsmsAuditFinding"("auditId");

-- CreateIndex
CREATE INDEX "IsmsAuditFinding_documentId_idx" ON "IsmsAuditFinding"("documentId");

-- CreateIndex
CREATE INDEX "IsmsAuditFinding_controlId_idx" ON "IsmsAuditFinding"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsAuditFinding_auditId_reference_key" ON "IsmsAuditFinding"("auditId", "reference");

-- AddForeignKey
ALTER TABLE "IsmsAudit" ADD CONSTRAINT "IsmsAudit_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsAuditControl" ADD CONSTRAINT "IsmsAuditControl_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "IsmsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsAuditFinding" ADD CONSTRAINT "IsmsAuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "IsmsAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsAuditFinding" ADD CONSTRAINT "IsmsAuditFinding_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "IsmsAuditControl"("id") ON DELETE SET NULL ON UPDATE CASCADE;

