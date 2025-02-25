/*
  Warnings:

  - The `status` column on the `Organization_integration_run` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'AZURE', 'GCP');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASS', 'FAIL', 'ERROR');

-- AlterTable
ALTER TABLE "Organization_integration_run" DROP COLUMN "status",
ADD COLUMN     "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING';
