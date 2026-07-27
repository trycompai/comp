-- CreateTable
CREATE TABLE "BrowserAutomationDraft" (
    "id" TEXT NOT NULL DEFAULT generate_prefixed_cuid('bad'::text),
    "taskId" TEXT NOT NULL,
    "createdById" TEXT,
    "name" TEXT,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrowserAutomationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrowserAutomationDraft_taskId_idx" ON "BrowserAutomationDraft"("taskId");

-- AddForeignKey
ALTER TABLE "BrowserAutomationDraft" ADD CONSTRAINT "BrowserAutomationDraft_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
