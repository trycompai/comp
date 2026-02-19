-- Seed IntegrationProvider for website checks
INSERT INTO "IntegrationProvider" (id, slug, name, category, capabilities, "isActive", "createdAt", "updatedAt")
VALUES (
  generate_prefixed_cuid('prv'),
  'website',
  'Website',
  'Security',
  '["checks"]'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Add compound unique index on IntegrationConnection(providerId, organizationId)
-- to support efficient lookups and prevent duplicate connections per provider/org pair
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_providerId_organizationId_key"
  ON "IntegrationConnection" ("providerId", "organizationId");
