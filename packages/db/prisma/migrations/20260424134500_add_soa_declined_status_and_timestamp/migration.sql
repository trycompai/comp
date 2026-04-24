-- AlterTable: Track when SOA document was declined
ALTER TABLE "SOADocument"
ADD COLUMN "declinedAt" TIMESTAMP(3);
