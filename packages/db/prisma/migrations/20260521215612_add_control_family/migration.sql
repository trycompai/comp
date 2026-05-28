-- DropForeignKey
ALTER TABLE "OffboardingAccessRevocation" DROP CONSTRAINT "OffboardingAccessRevocation_revokedById_fkey";

-- DropForeignKey
ALTER TABLE "OffboardingChecklistCompletion" DROP CONSTRAINT "OffboardingChecklistCompletion_completedById_fkey";

-- DropForeignKey
ALTER TABLE "OffboardingChecklistCompletion" DROP CONSTRAINT "OffboardingChecklistCompletion_templateItemId_fkey";

-- AlterTable
ALTER TABLE "FrameworkEditorControlTemplate" ADD COLUMN     "controlFamily" TEXT;

-- AlterTable
ALTER TABLE "OffboardingAccessRevocation" ALTER COLUMN "revokedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OffboardingChecklistCompletion" ALTER COLUMN "templateItemId" DROP NOT NULL,
ALTER COLUMN "completedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "OffboardingChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingChecklistCompletion" ADD CONSTRAINT "OffboardingChecklistCompletion_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffboardingAccessRevocation" ADD CONSTRAINT "OffboardingAccessRevocation_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
