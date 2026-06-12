/**
 * Pure helpers shared between CheckDefinitionService and its tests.
 * Kept in a separate file so tests can import them without pulling in
 * the Prisma client (which throws at import time when DATABASE_URL is
 * missing in a unit-test env).
 */

import { createHash } from 'node:crypto';
import { DESCRIPTION_MODEL_VERSION } from './ai-description.service';

/**
 * Strip the resource-specific suffix from a finding's `findingKey` so all
 * resource instances of the same check share a single cache entry.
 *
 * Examples:
 *   ("iam-no-mfa-john", "john")                       -> "iam-no-mfa"
 *   ("cloudtrail-not-logging-prod-trail", "prod-trail") -> "cloudtrail-not-logging"
 *   ("iam-no-password-policy", "account-level")       -> "iam-no-password-policy"
 */
export function normalizeCheckId(
  findingKey: string,
  resourceId: string | null,
): string {
  if (!resourceId) return findingKey;

  const suffix = `-${resourceId}`;
  if (findingKey.endsWith(suffix)) {
    return findingKey.slice(0, -suffix.length);
  }
  // Try each segment of compound resource ids (e.g. "api/route-1" -> ["api", "route-1"]).
  for (const segment of resourceId.split(/[/.]/)) {
    if (!segment) continue;
    const segSuffix = `-${segment}`;
    if (findingKey.endsWith(segSuffix)) {
      return findingKey.slice(0, -segSuffix.length);
    }
  }
  return findingKey;
}

/**
 * The stable check key used to key exceptions and suppress findings across
 * scans. Prefer the stamped `findingKey` (normalized to the bare check id);
 * fall back to the check run's own `checkId` for older rows stored before
 * findingKey stamping. The auto-run sentinel `'all'` is not a real check, so
 * it yields null (the finding can't be marked as an exception).
 *
 * Shared by the exception resolver and the findings query so a finding marked
 * as an exception is also the one suppressed from the list.
 */
export function resolveCheckKey(params: {
  findingKey: string | null;
  resourceId: string | null;
  runCheckId: string | null;
}): string | null {
  const { findingKey, resourceId, runCheckId } = params;
  if (findingKey) return normalizeCheckId(findingKey, resourceId);
  if (runCheckId && runCheckId !== 'all') return runCheckId;
  return null;
}

export interface SourceHashInput {
  provider: string;
  serviceName: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  remediation: string | null;
}

/**
 * Hash of the inputs that drive Haiku output. When this changes — because
 * the adapter altered the finding's title/description/severity/remediation
 * — the cache entry is regenerated on the next view. Includes the model
 * version so flipping DESCRIPTION_MODEL_VERSION forces a global refresh.
 */
export function computeSourceHash(input: SourceHashInput): string {
  const payload = JSON.stringify({
    provider: input.provider,
    serviceName: input.serviceName,
    title: input.title,
    description: input.description,
    severity: input.severity,
    remediation: input.remediation,
    model: DESCRIPTION_MODEL_VERSION,
  });
  return createHash('sha256').update(payload).digest('hex');
}
