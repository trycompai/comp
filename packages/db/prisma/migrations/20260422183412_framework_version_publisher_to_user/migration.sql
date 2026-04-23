-- Drop the old FK that points to Member
ALTER TABLE "FrameworkVersion" DROP CONSTRAINT "FrameworkVersion_publishedById_fkey";

-- Add new FK pointing to User
ALTER TABLE "FrameworkVersion" ADD CONSTRAINT "FrameworkVersion_publishedById_fkey"
  FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
