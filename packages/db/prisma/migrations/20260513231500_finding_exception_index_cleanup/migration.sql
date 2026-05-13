-- Drop the now-redundant non-unique index on (checkId, resourceId).
-- The unique constraint added by the previous migration already serves as
-- an index on those columns (as a prefix of the four-column unique key).
DROP INDEX IF EXISTS "FindingException_checkId_resourceId_idx";

-- Rename the manually-created unique index to match Prisma's naming
-- convention. Prisma uses `<Model>_<col1>_<col2>..._key`, truncated to
-- 63 chars (Postgres NAMEDATALEN limit). The previous migration used
-- `CREATE UNIQUE INDEX` with a longer name that Postgres truncated
-- differently, leaving the DB out of sync with what `prisma migrate dev`
-- would generate from the @@unique directive.
ALTER INDEX "FindingException_organizationId_connectionId_checkId_resourceId"
  RENAME TO "FindingException_organizationId_connectionId_checkId_resour_key";
