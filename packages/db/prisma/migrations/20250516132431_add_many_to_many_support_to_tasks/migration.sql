-- CreateTable
CREATE TABLE "_ControlToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ControlToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RiskToTask" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RiskToTask_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TaskToVendor" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskToVendor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ControlToTask_B_index" ON "_ControlToTask"("B");

-- CreateIndex
CREATE INDEX "_RiskToTask_B_index" ON "_RiskToTask"("B");

-- CreateIndex
CREATE INDEX "_TaskToVendor_B_index" ON "_TaskToVendor"("B");

-- AddForeignKey
ALTER TABLE "_ControlToTask" ADD CONSTRAINT "_ControlToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ControlToTask" ADD CONSTRAINT "_ControlToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RiskToTask" ADD CONSTRAINT "_RiskToTask_A_fkey" FOREIGN KEY ("A") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RiskToTask" ADD CONSTRAINT "_RiskToTask_B_fkey" FOREIGN KEY ("B") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskToVendor" ADD CONSTRAINT "_TaskToVendor_A_fkey" FOREIGN KEY ("A") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskToVendor" ADD CONSTRAINT "_TaskToVendor_B_fkey" FOREIGN KEY ("B") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Populate _ControlToTask from existing Task data
INSERT INTO "_ControlToTask" ("A", "B")
SELECT "entityId", "id"
FROM "Task"
WHERE "entityType" = 'control';

-- Populate _RiskToTask from existing Task data
INSERT INTO "_RiskToTask" ("A", "B")
SELECT "entityId", "id"
FROM "Task"
WHERE "entityType" = 'risk';

-- Populate _TaskToVendor from existing Task data
INSERT INTO "_TaskToVendor" ("A", "B")
SELECT "id", "entityId"
FROM "Task"
WHERE "entityType" = 'vendor';
