/*
  Warnings:

  - You are about to drop the column `authenticatedAt` on the `BrowserbaseContext` table. All the data in the column will be lost.
  - You are about to drop the column `connectionId` on the `BrowserbaseContext` table. All the data in the column will be lost.
  - You are about to drop the column `isAuthenticated` on the `BrowserbaseContext` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId]` on the table `BrowserbaseContext` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organizationId` to the `BrowserbaseContext` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BrowserAutomationEvaluationStatus" AS ENUM ('pass', 'fail');

-- CreateEnum
CREATE TYPE "BrowserAutomationRunStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- DropForeignKey
ALTER TABLE "BrowserbaseContext" DROP CONSTRAINT "BrowserbaseContext_connectionId_fkey";

-- DropIndex
DROP INDEX "BrowserbaseContext_connectionId_idx";

-- DropIndex
DROP INDEX "BrowserbaseContext_connectionId_key";

-- AlterTable
ALTER TABLE "BrowserbaseContext" DROP COLUMN "authenticatedAt",
DROP COLUMN "connectionId",
DROP COLUMN "isAuthenticated",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BrowserAutomation" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bau'::text),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "taskId" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrowserAutomationRun" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bar'::text),
    "automationId" TEXT NOT NULL,
    "status" "BrowserAutomationRunStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "screenshotUrl" TEXT,
    "evaluationStatus" "BrowserAutomationEvaluationStatus",
    "evaluationReason" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrowserAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrowserAutomation_taskId_idx" ON "BrowserAutomation"("taskId");

-- CreateIndex
CREATE INDEX "BrowserAutomationRun_automationId_idx" ON "BrowserAutomationRun"("automationId");

-- CreateIndex
CREATE INDEX "BrowserAutomationRun_status_idx" ON "BrowserAutomationRun"("status");

-- CreateIndex
CREATE INDEX "BrowserAutomationRun_createdAt_idx" ON "BrowserAutomationRun"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrowserbaseContext_organizationId_key" ON "BrowserbaseContext"("organizationId");

-- CreateIndex
CREATE INDEX "BrowserbaseContext_organizationId_idx" ON "BrowserbaseContext"("organizationId");

-- AddForeignKey
ALTER TABLE "BrowserbaseContext" ADD CONSTRAINT "BrowserbaseContext_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserAutomation" ADD CONSTRAINT "BrowserAutomation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrowserAutomationRun" ADD CONSTRAINT "BrowserAutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "BrowserAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
