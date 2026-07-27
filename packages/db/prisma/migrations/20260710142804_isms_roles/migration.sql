-- CreateEnum
CREATE TYPE "IsmsCompetenceBasis" AS ENUM ('education', 'training', 'experience', 'combination');

-- CreateEnum
CREATE TYPE "IsmsAuditRoute" AS ENUM ('in_house', 'external', 'training_planned');

-- AlterEnum
ALTER TYPE "IsmsDocumentType" ADD VALUE 'roles_and_responsibilities';

-- CreateTable
CREATE TABLE "IsmsRole" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_role'::text),
    "documentId" TEXT NOT NULL,
    "roleKey" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "authorities" TEXT NOT NULL,
    "authorityGrantedBy" TEXT NOT NULL,
    "requiredCompetence" TEXT NOT NULL,
    "auditRoute" "IsmsAuditRoute",
    "auditRouteMemberId" TEXT,
    "auditFirmName" TEXT,
    "auditEvidenceRef" TEXT,
    "auditCourse" TEXT,
    "auditDueDate" TIMESTAMP(3),
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsRoleAssignment" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ra'::text),
    "roleId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "basisOfCompetence" "IsmsCompetenceBasis",
    "evidenceRetained" TEXT,
    "gap" TEXT,
    "remediationAction" TEXT,
    "remediationDueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsRole_documentId_idx" ON "IsmsRole"("documentId");

-- CreateIndex
CREATE INDEX "IsmsRoleAssignment_roleId_idx" ON "IsmsRoleAssignment"("roleId");

-- CreateIndex
CREATE INDEX "IsmsRoleAssignment_documentId_idx" ON "IsmsRoleAssignment"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsRoleAssignment_roleId_memberId_key" ON "IsmsRoleAssignment"("roleId", "memberId");

-- AddForeignKey
ALTER TABLE "IsmsRole" ADD CONSTRAINT "IsmsRole_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsRoleAssignment" ADD CONSTRAINT "IsmsRoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "IsmsRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
