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
