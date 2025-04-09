-- CreateTable
CREATE TABLE "Onboarding" (
    "organizationId" TEXT NOT NULL,
    "team" BOOLEAN NOT NULL,
    "risk" BOOLEAN NOT NULL,
    "vendors" BOOLEAN NOT NULL,
    "integrations" BOOLEAN NOT NULL,

    CONSTRAINT "Onboarding_pkey" PRIMARY KEY ("organizationId")
);

-- CreateIndex
CREATE INDEX "Onboarding_organizationId_idx" ON "Onboarding"("organizationId");

-- AddForeignKey
ALTER TABLE "Onboarding" ADD CONSTRAINT "Onboarding_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Insert onboarding records for existing organizations
INSERT INTO "Onboarding" ("organizationId", "team", "risk", "vendors", "integrations")
SELECT 
    id,
    false,
    false, 
    false,
    false
FROM "Organization";
