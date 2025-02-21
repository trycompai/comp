-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestResult" AS ENUM ('PASS', 'FAIL', 'ERROR');

-- CreateTable
CREATE TABLE "cloud_test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "provider" "CloudProvider" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "config" JSONB NOT NULL,
    "authConfig" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_test_run" (
    "id" TEXT NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "resultDetails" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cloudTestId" TEXT NOT NULL,
    "executedById" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_test_run_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cloud_test_organizationId_idx" ON "cloud_test"("organizationId");
CREATE INDEX "cloud_test_run_cloudTestId_idx" ON "cloud_test_run"("cloudTestId");
CREATE INDEX "cloud_test_run_organizationId_idx" ON "cloud_test_run"("organizationId");
CREATE INDEX "cloud_test_createdById_idx" ON "cloud_test"("createdById");
CREATE INDEX "cloud_test_updatedById_idx" ON "cloud_test"("updatedById");

-- AddForeignKey
ALTER TABLE "cloud_test" ADD CONSTRAINT "cloud_test_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cloud_test" ADD CONSTRAINT "cloud_test_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cloud_test" ADD CONSTRAINT "cloud_test_updatedById_fkey" 
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_test_run" ADD CONSTRAINT "cloud_test_run_cloudTestId_fkey" 
    FOREIGN KEY ("cloudTestId") REFERENCES "cloud_test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_test_run" ADD CONSTRAINT "cloud_test_run_executedById_fkey" 
    FOREIGN KEY ("executedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_test_run" ADD CONSTRAINT "cloud_test_run_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; 