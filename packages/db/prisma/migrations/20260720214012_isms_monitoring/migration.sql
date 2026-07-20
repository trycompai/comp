-- CreateEnum
CREATE TYPE "IsmsMetricCadence" AS ENUM ('monthly', 'quarterly');

-- AlterEnum
ALTER TYPE "IsmsDocumentType" ADD VALUE 'monitoring';

-- CreateTable
CREATE TABLE "IsmsMetric" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_met'::text),
    "documentId" TEXT NOT NULL,
    "metricKey" TEXT,
    "name" TEXT NOT NULL,
    "whatIsMeasured" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "cadence" "IsmsMetricCadence",
    "monitorMemberId" TEXT,
    "analyzeMemberId" TEXT,
    "target" TEXT,
    "objectiveId" TEXT,
    "dataSource" TEXT NOT NULL DEFAULT 'manual',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "IsmsContextSource" NOT NULL DEFAULT 'derived',
    "derivedFrom" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IsmsMeasurement" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_msr'::text),
    "metricId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "value" TEXT NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enteredById" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsMetric_documentId_idx" ON "IsmsMetric"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsMetric_documentId_metricKey_key" ON "IsmsMetric"("documentId", "metricKey");

-- CreateIndex
CREATE INDEX "IsmsMeasurement_metricId_periodStart_idx" ON "IsmsMeasurement"("metricId", "periodStart");

-- CreateIndex
CREATE INDEX "IsmsMeasurement_documentId_idx" ON "IsmsMeasurement"("documentId");

-- AddForeignKey
ALTER TABLE "IsmsMetric" ADD CONSTRAINT "IsmsMetric_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "IsmsDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsMetric" ADD CONSTRAINT "IsmsMetric_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "IsmsObjective"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsMeasurement" ADD CONSTRAINT "IsmsMeasurement_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "IsmsMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
