-- Enforce one seeded governance role per key per document (idempotency anchor for
-- seedRolesIfMissing). Custom roles have roleKey = NULL; Postgres treats NULLs as
-- distinct, so multiple custom roles per document remain allowed.
CREATE UNIQUE INDEX "IsmsRole_documentId_roleKey_key" ON "IsmsRole"("documentId", "roleKey");
