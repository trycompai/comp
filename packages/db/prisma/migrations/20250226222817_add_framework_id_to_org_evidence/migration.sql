/*
  Warnings:

  - Added the required column `frameworkId` to the `OrganizationEvidence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrganizationEvidence" ADD COLUMN     "frameworkId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OrganizationEvidence" ADD CONSTRAINT "OrganizationEvidence_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
