/*
  Warnings:

  - The values [program_manager] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('owner', 'admin', 'auditor', 'employee', 'contractor');
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- CreateTable
CREATE TABLE "organization_role" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('rol'::text),
    "name" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_role_organizationId_name_key" ON "organization_role"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
