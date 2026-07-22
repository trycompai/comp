-- CreateEnum
CREATE TYPE "IsmsReviewStatus" AS ENUM ('planned', 'in_progress', 'complete');

-- CreateEnum
CREATE TYPE "IsmsReviewConclusionVerdict" AS ENUM ('suitable', 'adequate', 'effective');

-- CreateEnum
CREATE TYPE "IsmsReviewActionStatus" AS ENUM ('open', 'in_progress', 'closed');

-- AlterEnum
ALTER TYPE "IsmsDocumentType" ADD VALUE 'management_review';

-- CreateTable
CREATE TABLE "IsmsManagementReview" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_mr'::text),
    "documentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "meetingDate" DATE,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chairName" TEXT,
    "attendees" JSONB NOT NULL DEFAULT '[]',
    "status" "IsmsReviewStatus" NOT NULL DEFAULT 'planned',
    "conclusionVerdict" "IsmsReviewConclusionVerdict",
    "conclusionNotes" TEXT,
    "decisionsText" TEXT,
    "changesText" TEXT,
    "signoffChairName" TEXT,
    "signoffChairDate" DATE,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsManagementReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsReviewInput" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_mri'::text),
    "reviewId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "inputKey" TEXT,
    "inputRef" TEXT NOT NULL,
    "whatItCovers" TEXT NOT NULL,
    "whereToFind" TEXT NOT NULL,
    "discussionNotes" TEXT,
    "discussed" BOOLEAN NOT NULL DEFAULT false,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsReviewInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsReviewAction" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_mra'::text),
    "reviewId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ownerMemberId" TEXT,
    "dueDate" DATE,
    "status" "IsmsReviewActionStatus" NOT NULL DEFAULT 'open',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsReviewAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsManagementReview_documentId_idx" ON "IsmsManagementReview"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsManagementReview_documentId_reference_key" ON "IsmsManagementReview"("documentId", "reference");

-- CreateIndex
CREATE INDEX "IsmsReviewInput_reviewId_idx" ON "IsmsReviewInput"("reviewId");

-- CreateIndex
CREATE INDEX "IsmsReviewInput_documentId_idx" ON "IsmsReviewInput"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsReviewInput_reviewId_inputKey_key" ON "IsmsReviewInput"("reviewId", "inputKey");

-- CreateIndex
CREATE INDEX "IsmsReviewAction_reviewId_idx" ON "IsmsReviewAction"("reviewId");

-- CreateIndex
CREATE INDEX "IsmsReviewAction_documentId_idx" ON "IsmsReviewAction"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsReviewAction_reviewId_reference_key" ON "IsmsReviewAction"("reviewId", "reference");

-- AddForeignKey
ALTER TABLE "IsmsManagementReview" ADD CONSTRAINT "IsmsManagementReview_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsReviewInput" ADD CONSTRAINT "IsmsReviewInput_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "IsmsManagementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsReviewAction" ADD CONSTRAINT "IsmsReviewAction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "IsmsManagementReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

