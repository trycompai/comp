/*
  Warnings:

  - You are about to drop the column `scopes` on the `TrustAccessGrant` table. All the data in the column will be lost.
  - You are about to drop the column `requestedScopes` on the `TrustAccessRequest` table. All the data in the column will be lost.
  - You are about to drop the column `scopes` on the `TrustDocument` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TrustAccessGrant" DROP COLUMN "scopes";

-- AlterTable
ALTER TABLE "TrustAccessRequest" DROP COLUMN "requestedScopes";

-- AlterTable
ALTER TABLE "TrustDocument" DROP COLUMN "scopes";
