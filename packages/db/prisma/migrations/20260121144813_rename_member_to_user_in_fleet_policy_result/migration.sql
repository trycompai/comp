-- Rename column
ALTER TABLE "FleetPolicyResult" RENAME COLUMN "memberId" TO "userId";

-- Drop old index if exists and create new index
DROP INDEX IF EXISTS "FleetPolicyResult_memberId_idx";
CREATE INDEX "FleetPolicyResult_userId_idx" ON "FleetPolicyResult"("userId");

-- Drop old foreign key and add new one to User
ALTER TABLE "FleetPolicyResult" DROP CONSTRAINT IF EXISTS "FleetPolicyResult_memberId_fkey";
ALTER TABLE "FleetPolicyResult" ADD CONSTRAINT "FleetPolicyResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
