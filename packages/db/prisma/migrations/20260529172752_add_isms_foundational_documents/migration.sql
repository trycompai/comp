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
