/*
  Warnings:

  - You are about to drop the column `fleetDmSecret` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `osqueryAgentDownloadUrl` on the `Organization` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "fleetDmSecret",
DROP COLUMN "osqueryAgentDownloadUrl";
