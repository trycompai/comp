/*
  Warnings:

  - A unique constraint covering the columns `[controlId,frameworkInstanceId,frameworkInstanceRequirementId]` on the table `RequirementMap` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RequirementMap" ADD COLUMN     "frameworkInstanceRequirementId" TEXT,
ALTER COLUMN "requirementId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FrameworkInstanceRequirement" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('fir'::text),
    "frameworkInstanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrameworkInstanceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FrameworkInstanceRequirement_frameworkInstanceId_idx" ON "FrameworkInstanceRequirement"("frameworkInstanceId");

-- CreateIndex
CREATE INDEX "RequirementMap_frameworkInstanceRequirementId_frameworkInst_idx" ON "RequirementMap"("frameworkInstanceRequirementId", "frameworkInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementMap_controlId_frameworkInstanceId_frameworkInsta_key" ON "RequirementMap"("controlId", "frameworkInstanceId", "frameworkInstanceRequirementId");

-- AddForeignKey
ALTER TABLE "FrameworkInstanceRequirement" ADD CONSTRAINT "FrameworkInstanceRequirement_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementMap" ADD CONSTRAINT "RequirementMap_frameworkInstanceRequirementId_fkey" FOREIGN KEY ("frameworkInstanceRequirementId") REFERENCES "FrameworkInstanceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
