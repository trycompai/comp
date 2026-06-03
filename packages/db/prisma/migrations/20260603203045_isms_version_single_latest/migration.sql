-- Enforce at most one latest version per ISMS document.
-- Prisma cannot express a filtered unique index, so this partial unique index is
-- applied via raw SQL. It guarantees deterministic "latest" reads: a documentId
-- can have at most one row with isLatest = true. Documented on the
-- IsmsDocumentVersion model in schema/isms.prisma.
CREATE UNIQUE INDEX IF NOT EXISTS "isms_document_version_one_latest" ON "IsmsDocumentVersion" ("documentId") WHERE "isLatest" = true;
