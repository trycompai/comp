import type { OpenAPIObject } from '@nestjs/swagger';

export const PUBLIC_DOCS_EXCLUDED_PREFIXES = [
  '/v1/auth',
  '/v1/admin',
  '/v1/internal',
  '/v1/mcp',
  '/v1/framework-editor',
  '/v1/browserbase',
  '/v1/assistant-chat',
  '/v1/health',
  '/v1/email/unsubscribe',
  '/v1/integrations/webhooks',
  '/v1/secrets',
  '/v1/billing',
  '/v1/background-check-billing',
  '/v1/background-checks',
  '/v1/pentest-credits',
  '/v1/finding-template',
  '/v1/integrations/oauth',
  '/v1/integrations/oauth-apps',
  '/v1/integrations/internal',
  '/v1/cloud-security/legacy',
  '/v1/cloud-security/remediation',
  '/v1/questionnaire/parse/upload/token',
  '/v1/trust-access/access',
  '/v1/trust-access/nda',
];

export const PUBLIC_DOCS_EXCLUDED_PATH_PATTERNS = [
  /\/background-check(?:\/|$)/,
  /\/credentials(?:\/|$)/,
  /\/ensure-valid-credentials(?:\/|$)/,
  /\/webhooks?(?:\/|$)/,
];

const SENSITIVE_TAGS = [
  'Background Check Billing',
  'Background Checks',
  'Billing',
  'Finding Templates',
  'Pentest Credits',
  'Secrets',
];

const SENSITIVE_SCHEMA_DETAILS = [
  'BackgroundCheckBillingPortalDto',
  'BillingPortalDto',
  'BillingPreferencesDto',
  'CreateFindingTemplateDto',
  'Finding template ID',
  'Maced check IDs',
  'UpdateFindingTemplateDto',
  'impact_proof',
  'pipelineTesting',
  'secrets_info_disclosure',
  'testMode',
  'webhookUrl',
];

type OperationForQuality = {
  description?: string;
  summary?: string;
  tags?: string[];
  'x-excluded'?: true;
  'x-mint'?: {
    metadata?: { description?: string; title?: string };
  };
};

export function collectPublicOpenApiIssues(document: OpenAPIObject) {
  const excludedPaths = Object.keys(document.paths).filter(
    (path) =>
      PUBLIC_DOCS_EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix)) ||
      PUBLIC_DOCS_EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(path)),
  );
  const missingSummaries: string[] = [];
  const missingMetadata: string[] = [];
  const invalidSeo: string[] = [];
  const exposedTags = new Set<string>();

  for (const [routePath, methods] of Object.entries(document.paths)) {
    for (const [method, op] of Object.entries(
      methods as Record<string, OperationForQuality>,
    )) {
      if (typeof op !== 'object' || !op || op['x-excluded']) continue;
      const endpoint = `${method.toUpperCase()} ${routePath}`;
      const meta = op['x-mint']?.metadata;

      if (!op.summary?.trim()) missingSummaries.push(endpoint);
      if (!op.description?.trim() || !meta?.description?.trim()) {
        missingMetadata.push(endpoint);
      }
      if (
        meta?.description &&
        (meta.description.length < 80 ||
          meta.description.length > 160 ||
          meta.description.includes('Use this Comp AI'))
      ) {
        invalidSeo.push(endpoint);
      }
      if (meta?.title && meta.title.length > 60) invalidSeo.push(endpoint);
      for (const tag of op.tags ?? []) {
        if (SENSITIVE_TAGS.includes(tag)) exposedTags.add(tag);
      }
    }
  }

  const serialized = JSON.stringify(document);
  const sensitiveSchemaDetails = SENSITIVE_SCHEMA_DETAILS.filter((detail) =>
    serialized.includes(detail),
  );

  return {
    excludedPaths,
    exposedTags: [...exposedTags].sort(),
    invalidSeo,
    missingMetadata,
    missingSummaries,
    sensitiveSchemaDetails,
  };
}
