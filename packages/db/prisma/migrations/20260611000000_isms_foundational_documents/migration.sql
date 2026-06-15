-- ISMS foundational documents (CS-437)
-- Consolidated migration: squashed from 7 incremental ISMS migrations
-- created during development. Applies as a single transaction.

-- ----------------------------------------------------------------------------
-- (was 20260529172752_add_isms_foundational_documents)
-- ----------------------------------------------------------------------------
-- CreateEnum
CREATE TYPE "IsmsDocumentType" AS ENUM ('context_of_organization', 'interested_parties_register', 'interested_parties_requirements', 'isms_scope', 'leadership_commitment', 'objectives_plan');

-- CreateEnum
CREATE TYPE "IsmsDocumentStatus" AS ENUM ('draft', 'in_progress', 'needs_review', 'approved', 'declined');

-- CreateEnum
CREATE TYPE "IsmsContextIssueKind" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "IsmsContextSource" AS ENUM ('derived', 'manual');

-- CreateTable
CREATE TABLE "IsmsDocument" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_doc'::text),
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "requirementId" TEXT,
    "type" "IsmsDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "IsmsDocumentStatus" NOT NULL DEFAULT 'draft',
    "preparedBy" TEXT NOT NULL DEFAULT 'Comp AI',
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsDocumentVersion" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ver'::text),
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "narrative" JSONB NOT NULL,
    "sourceSnapshot" JSONB,
    "pdfUrl" TEXT,
    "docxUrl" TEXT,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsContextIssue" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ci'::text),
    "documentId" TEXT NOT NULL,
    "kind" "IsmsContextIssueKind" NOT NULL,
    "description" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsContextIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsDocument_organizationId_type_idx" ON "IsmsDocument"("organizationId", "type");

-- CreateIndex
CREATE INDEX "IsmsDocument_frameworkId_idx" ON "IsmsDocument"("frameworkId");

-- CreateIndex
CREATE INDEX "IsmsDocument_requirementId_idx" ON "IsmsDocument"("requirementId");

-- CreateIndex
CREATE INDEX "IsmsDocument_status_idx" ON "IsmsDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocument_organizationId_frameworkId_type_key" ON "IsmsDocument"("organizationId", "frameworkId", "type");

-- CreateIndex
CREATE INDEX "IsmsDocumentVersion_documentId_idx" ON "IsmsDocumentVersion"("documentId");

-- CreateIndex
CREATE INDEX "IsmsDocumentVersion_documentId_isLatest_idx" ON "IsmsDocumentVersion"("documentId", "isLatest");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocumentVersion_documentId_version_key" ON "IsmsDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "IsmsContextIssue_documentId_kind_idx" ON "IsmsContextIssue"("documentId", "kind");

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkEditorRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentVersion" ADD CONSTRAINT "IsmsDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsContextIssue" ADD CONSTRAINT "IsmsContextIssue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- (was 20260529180911_extend_isms_registers)
-- ----------------------------------------------------------------------------
-- CreateEnum
CREATE TYPE "IsmsObjectiveStatus" AS ENUM ('not_started', 'on_track', 'at_risk', 'met');

-- CreateTable
CREATE TABLE "IsmsInterestedParty" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ip'::text),
    "documentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "needsExpectations" TEXT NOT NULL,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsInterestedParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsInterestedPartyRequirement" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_ipr'::text),
    "documentId" TEXT NOT NULL,
    "interestedPartyId" TEXT,
    "partyName" TEXT NOT NULL,
    "requirement" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsInterestedPartyRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsObjective" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_obj'::text),
    "documentId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "target" TEXT,
    "ownerMemberId" TEXT,
    "cadence" TEXT,
    "plan" TEXT,
    "measurementMethod" TEXT,
    "status" "IsmsObjectiveStatus" NOT NULL DEFAULT 'not_started',
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsObjective_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsInterestedParty_documentId_idx" ON "IsmsInterestedParty"("documentId");

-- CreateIndex
CREATE INDEX "IsmsInterestedPartyRequirement_documentId_idx" ON "IsmsInterestedPartyRequirement"("documentId");

-- CreateIndex
CREATE INDEX "IsmsInterestedPartyRequirement_interestedPartyId_idx" ON "IsmsInterestedPartyRequirement"("interestedPartyId");

-- CreateIndex
CREATE INDEX "IsmsObjective_documentId_idx" ON "IsmsObjective"("documentId");

-- AddForeignKey
ALTER TABLE "IsmsInterestedParty" ADD CONSTRAINT "IsmsInterestedParty_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsInterestedPartyRequirement" ADD CONSTRAINT "IsmsInterestedPartyRequirement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsInterestedPartyRequirement" ADD CONSTRAINT "IsmsInterestedPartyRequirement_interestedPartyId_fkey" FOREIGN KEY ("interestedPartyId") REFERENCES "IsmsInterestedParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsObjective" ADD CONSTRAINT "IsmsObjective_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- (was 20260529185949_add_isms_profile)
-- ----------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "IsmsProfile" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_pf'::text),
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsProfile_organizationId_idx" ON "IsmsProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsProfile_organizationId_frameworkId_key" ON "IsmsProfile"("organizationId", "frameworkId");

-- AddForeignKey
ALTER TABLE "IsmsProfile" ADD CONSTRAINT "IsmsProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsProfile" ADD CONSTRAINT "IsmsProfile_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- (was 20260601131826_add_isms_document_templates)
-- ----------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "IsmsDocument" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "FrameworkEditorIsmsDocumentTemplate" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('frk_isd'::text),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "documentType" "IsmsDocumentType" NOT NULL,
    "clause" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorIsmsDocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkEditorIsmsDocumentRequirementLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('frk_idr'::text),
    "frameworkId" TEXT NOT NULL,
    "ismsDocumentTemplateId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorIsmsDocumentTemplate_documentType_key" ON "FrameworkEditorIsmsDocumentTemplate"("documentType");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_ismsDocumentTemp_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_requirementId_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("requirementId");

-- CreateIndex
CREATE INDEX "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_idx" ON "FrameworkEditorIsmsDocumentRequirementLink"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_isms_key" ON "FrameworkEditorIsmsDocumentRequirementLink"("frameworkId", "ismsDocumentTemplateId", "requirementId");

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_ismsDocumentTem_fkey" FOREIGN KEY ("ismsDocumentTemplateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorIsmsDocumentRequirementLink" ADD CONSTRAINT "FrameworkEditorIsmsDocumentRequirementLink_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FrameworkEditorRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocument" ADD CONSTRAINT "IsmsDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- (was 20260601133346_add_isms_control_links)
-- ----------------------------------------------------------------------------
-- CreateTable
CREATE TABLE "FrameworkEditorControlIsmsDocumentLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fcid'::text),
    "frameworkId" TEXT NOT NULL,
    "controlTemplateId" TEXT NOT NULL,
    "ismsDocumentTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsDocumentControlLink" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('idc'::text),
    "ismsDocumentId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IsmsDocumentControlLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_controlTemplateId_idx" ON "FrameworkEditorControlIsmsDocumentLink"("controlTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_ismsDocumentTemplate_idx" ON "FrameworkEditorControlIsmsDocumentLink"("ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "FrameworkEditorControlIsmsDocumentLink_frameworkId_idx" ON "FrameworkEditorControlIsmsDocumentLink"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkEditorControlIsmsDocumentLink_frameworkId_controlT_key" ON "FrameworkEditorControlIsmsDocumentLink"("frameworkId", "controlTemplateId", "ismsDocumentTemplateId");

-- CreateIndex
CREATE INDEX "IsmsDocumentControlLink_ismsDocumentId_idx" ON "IsmsDocumentControlLink"("ismsDocumentId");

-- CreateIndex
CREATE INDEX "IsmsDocumentControlLink_controlId_idx" ON "IsmsDocumentControlLink"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsDocumentControlLink_ismsDocumentId_controlId_key" ON "IsmsDocumentControlLink"("ismsDocumentId", "controlId");

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_controlTemplateId_fkey" FOREIGN KEY ("controlTemplateId") REFERENCES "FrameworkEditorControlTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkEditorControlIsmsDocumentLink" ADD CONSTRAINT "FrameworkEditorControlIsmsDocumentLink_ismsDocumentTemplat_fkey" FOREIGN KEY ("ismsDocumentTemplateId") REFERENCES "FrameworkEditorIsmsDocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentControlLink" ADD CONSTRAINT "IsmsDocumentControlLink_ismsDocumentId_fkey" FOREIGN KEY ("ismsDocumentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsDocumentControlLink" ADD CONSTRAINT "IsmsDocumentControlLink_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- (was 20260602145616_add_isms_context_issue_category)
-- ----------------------------------------------------------------------------
-- AlterTable
ALTER TABLE "IsmsContextIssue" ADD COLUMN     "category" TEXT;

-- ----------------------------------------------------------------------------
-- (was 20260603203045_isms_version_single_latest)
-- ----------------------------------------------------------------------------
-- Enforce at most one latest version per ISMS document.
-- Prisma cannot express a filtered unique index, so this partial unique index is
-- applied via raw SQL. It guarantees deterministic "latest" reads: a documentId
-- can have at most one row with isLatest = true. Documented on the
-- IsmsDocumentVersion model in schema/isms.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "isms_document_version_one_latest" ON "IsmsDocumentVersion" ("documentId") WHERE "isLatest" = true;

