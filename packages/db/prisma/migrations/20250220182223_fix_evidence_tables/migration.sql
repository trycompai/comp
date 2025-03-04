/*
  Warnings:

  - You are about to drop the column `fileUrls` on the `Evidence` table. All the data in the column will be lost.
  - You are about to drop the column `links` on the `Evidence` table. All the data in the column will be lost.
  - You are about to drop the column `attachments` on the `OrganizationEvidence` table. All the data in the column will be lost.
  - Added the required column `evidenceId` to the `OrganizationEvidence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ControlRequirement" ADD COLUMN     "evidenceId" TEXT;

-- AlterTable
ALTER TABLE "Evidence" DROP COLUMN "fileUrls",
DROP COLUMN "links";

-- AlterTable
ALTER TABLE "OrganizationEvidence" DROP COLUMN "attachments",
ADD COLUMN     "additionalUrls" TEXT[],
ADD COLUMN     "evidenceId" TEXT NOT NULL,
ADD COLUMN     "fileUrls" TEXT[];

-- AddForeignKey
ALTER TABLE "ControlRequirement" ADD CONSTRAINT "ControlRequirement_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationEvidence" ADD CONSTRAINT "OrganizationEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
