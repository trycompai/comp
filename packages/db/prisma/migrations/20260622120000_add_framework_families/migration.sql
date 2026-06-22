-- FRAME-20: framework families (folders that group frameworks in the editor).

-- CreateEnum
CREATE TYPE "FrameworkEditorFrameworkFamilyStatus" AS ENUM ('visible', 'hidden', 'under_construction', 'partial');

-- CreateTable
CREATE TABLE "FrameworkEditorFrameworkFamily" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('frk_fam'::text),
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "FrameworkEditorFrameworkFamilyStatus" NOT NULL DEFAULT 'hidden',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkEditorFrameworkFamily_pkey" PRIMARY KEY ("id")
);

-- AlterTable: link frameworks to a family (null = ungrouped / root).
ALTER TABLE "FrameworkEditorFramework" ADD COLUMN "familyId" TEXT;

-- CreateIndex
CREATE INDEX "FrameworkEditorFramework_familyId_idx" ON "FrameworkEditorFramework"("familyId");

-- AddForeignKey: Restrict enforces "delete a family only when empty" at the DB level.
ALTER TABLE "FrameworkEditorFramework" ADD CONSTRAINT "FrameworkEditorFramework_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "FrameworkEditorFrameworkFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
