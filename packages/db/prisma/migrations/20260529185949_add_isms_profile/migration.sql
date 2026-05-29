-- CreateTable
CREATE TABLE "IsmsProfile" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('isms_pf'::text),
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IsmsProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IsmsProfile_organizationId_idx" ON "IsmsProfile"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IsmsProfile_organizationId_frameworkId_key" ON "IsmsProfile"("organizationId", "frameworkId");

-- AddForeignKey
ALTER TABLE "IsmsProfile" ADD CONSTRAINT "IsmsProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IsmsProfile" ADD CONSTRAINT "IsmsProfile_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "FrameworkEditorFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
