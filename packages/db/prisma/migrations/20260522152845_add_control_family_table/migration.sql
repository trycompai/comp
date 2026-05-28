-- CreateTable
CREATE TABLE "FrameworkControlFamily" (
    "frameworkInstanceId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "controlFamily" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "FrameworkControlFamily_frameworkInstanceId_idx" ON "FrameworkControlFamily"("frameworkInstanceId");

-- CreateIndex
CREATE INDEX "FrameworkControlFamily_controlId_idx" ON "FrameworkControlFamily"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControlFamily_frameworkInstanceId_controlId_key" ON "FrameworkControlFamily"("frameworkInstanceId", "controlId");

-- AddForeignKey
ALTER TABLE "FrameworkControlFamily" ADD CONSTRAINT "FrameworkControlFamily_frameworkInstanceId_fkey" FOREIGN KEY ("frameworkInstanceId") REFERENCES "FrameworkInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControlFamily" ADD CONSTRAINT "FrameworkControlFamily_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;
