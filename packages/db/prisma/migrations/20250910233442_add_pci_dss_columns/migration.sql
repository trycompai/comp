-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "pci_dss" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Trust" ADD COLUMN     "pci_dss_status" "FrameworkStatus" NOT NULL DEFAULT 'started';
