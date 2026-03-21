-- CreateTable
CREATE TABLE "ControlDocumentType" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('cdt'::text),
    "controlId" TEXT NOT NULL,
    "formType" "EvidenceFormType" NOT NULL,

    CONSTRAINT "ControlDocumentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ControlDocumentType_controlId_idx" ON "ControlDocumentType"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlDocumentType_controlId_formType_key" ON "ControlDocumentType"("controlId", "formType");

-- AddForeignKey
ALTER TABLE "ControlDocumentType" ADD CONSTRAINT "ControlDocumentType_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;
