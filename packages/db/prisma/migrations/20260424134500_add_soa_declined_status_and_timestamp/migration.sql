-- AlterEnum: Add declined status for SOA document workflow
ALTER TYPE "SOADocumentStatus" ADD VALUE 'declined';

-- AlterTable: Track when SOA document was declined
ALTER TABLE "SOADocument"
ADD COLUMN "declinedAt" TIMESTAMP(3);
