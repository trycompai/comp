import { AuditLogEntityType } from '@db';
import { AuthenticatedRequest } from '../auth/types';
import {
  COMMENT_ENTITY_TYPE_MAP,
  MEMBER_REF_FIELDS,
  SENSITIVE_KEYS,
} from './audit-log.constants';

export type AuditContextOverride = {
  entityType: AuditLogEntityType;
  entityId: string;
  description: string;
};

export type ChangesRecord = Record<
  string,
  { previous: unknown; current: unknown }
>;

export type RelationMappingResult = {
  changes: ChangesRecord;
  description: string;
};

export function extractCommentContext(
  path: string,
  method: string,
  requestBody: Record<string, unknown> | undefined,
): AuditContextOverride | null {
  if (!path.includes('/comments')) return null;

  if (method === 'POST' && requestBody) {
    const bodyEntityType = requestBody.entityType as string | undefined;
    const bodyEntityId = requestBody.entityId as string | undefined;
    if (bodyEntityType && bodyEntityId) {
      const mappedType = COMMENT_ENTITY_TYPE_MAP[bodyEntityType];
      if (mappedType) {
        return {
          entityType: mappedType,
          entityId: bodyEntityId,
          description: `Commented on ${bodyEntityType}`,
        };
      }
    }
  }

  if (method === 'DELETE') {
    return {
      entityType: null as unknown as AuditLogEntityType,
      entityId: null as unknown as string,
      description: 'Deleted comment',
    };
  }

  return null;
}

/**
 * Detects download/export GET endpoints and returns a human-readable
 * description. Returns null for non-download endpoints.
 */
export function extractDownloadDescription(
  path: string,
  method: string,
): string | null {
  if (method !== 'GET') return null;

  const pathWithoutQuery = path.split('?')[0];

  if (/\/pdf\/signed-url\/?$/.test(pathWithoutQuery))
    return 'Downloaded policy PDF';
  if (/\/download-all\/?$/.test(pathWithoutQuery))
    return 'Downloaded all policies PDF';
  if (/\/evidence\/automation\/[^/]+\/pdf\/?$/.test(pathWithoutQuery))
    return 'Exported automation evidence PDF';
  if (/\/evidence\/export\/?$/.test(pathWithoutQuery))
    return 'Exported task evidence';
  if (/\/evidence-export\/all\/?$/.test(pathWithoutQuery))
    return 'Exported all organization evidence';

  return null;
}

/**
 * Detects version and approval endpoints and builds a description
 * that includes the version number from the response body.
 */
export function extractVersionDescription(
  path: string,
  method: string,
  responseBody: unknown,
): string | null {
  const isVersionPath = /\/versions(?:\/|$)/.test(path);
  const isApprovalPath = /\/(accept|deny)-changes\/?$/.test(path);

  if (!isVersionPath && !isApprovalPath) return null;

  const versionNum = extractVersionNumber(responseBody);
  const suffix = versionNum ? ` version ${versionNum}` : '';

  // POST /v1/policies/:id/accept-changes
  if (/\/accept-changes\/?$/.test(path) && method === 'POST') {
    return `Approved and published policy${suffix}`;
  }

  // POST /v1/policies/:id/deny-changes
  if (/\/deny-changes\/?$/.test(path) && method === 'POST') {
    return 'Denied policy changes';
  }

  if (/\/versions\/publish\/?$/.test(path) && method === 'POST') {
    return `Published policy${suffix}`;
  }

  if (/\/versions\/[^/]+\/activate\/?$/.test(path) && method === 'POST') {
    return `Activated policy${suffix}`;
  }

  if (
    /\/versions\/[^/]+\/submit-for-approval\/?$/.test(path) &&
    method === 'POST'
  ) {
    return `Submitted policy${suffix} for approval`;
  }

  if (/\/versions\/?$/.test(path) && method === 'POST') {
    return `Created policy${suffix}`;
  }

  // PATCH /v1/policies/:id/versions/:versionId (edit content)
  if (/\/versions\/[^/]+\/?$/.test(path) && method === 'PATCH') {
    return `Updated policy${suffix} content`;
  }

  if (/\/versions\/[^/]+\/?$/.test(path) && method === 'DELETE') {
    const deletedVersion = extractDeletedVersionNumber(responseBody);
    const delSuffix = deletedVersion ? ` version ${deletedVersion}` : '';
    return `Deleted policy${delSuffix}`;
  }

  return null;
}

function extractVersionNumber(responseBody: unknown): number | null {
  if (!responseBody || typeof responseBody !== 'object') return null;
  const body = responseBody as Record<string, unknown>;
  if (typeof body.version === 'number') return body.version;
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (typeof data.version === 'number') return data.version;
  }
  return null;
}

function extractDeletedVersionNumber(responseBody: unknown): number | null {
  if (!responseBody || typeof responseBody !== 'object') return null;
  const body = responseBody as Record<string, unknown>;
  if (typeof body.deletedVersion === 'number') return body.deletedVersion;
  if (body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (typeof data.deletedVersion === 'number') return data.deletedVersion;
  }
  return null;
}

/**
 * Detects policy-specific actions (regenerate, archive/restore) and returns
 * a human-readable description. Returns null for non-matching endpoints.
 */
export function extractPolicyActionDescription(
  path: string,
  method: string,
  requestBody: Record<string, unknown> | undefined,
): string | null {
  // POST /v1/policies/:id/regenerate
  if (/\/regenerate\/?$/.test(path) && method === 'POST') {
    return 'Regenerated policy';
  }

  // PATCH /v1/policies/:id with isArchived field
  if (method === 'PATCH' && requestBody && 'isArchived' in requestBody) {
    return requestBody.isArchived ? 'Archived policy' : 'Restored policy';
  }

  return null;
}

export function buildDescription(
  _method: string,
  action: string,
  resource: string,
): string {
  switch (action) {
    case 'create':
      return `Created ${resource}`;
    case 'update':
      return `Updated ${resource}`;
    case 'delete':
      return `Deleted ${resource}`;
    case 'publish':
      return `Published ${resource}`;
    case 'approve':
      return `Approved ${resource}`;
    case 'assign':
      return `Assigned ${resource}`;
    case 'upload':
      return `Uploaded to ${resource}`;
    case 'export':
      return `Exported ${resource}`;
    default: {
      const capitalizedAction =
        action.charAt(0).toUpperCase() + action.slice(1);
      return `${capitalizedAction} ${resource}`;
    }
  }
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && !Array.isArray(value))
    return '[Object]';
  return value;
}

export function buildChanges(
  body: Record<string, unknown>,
  previousValues: Record<string, unknown> | null,
  memberNames: Record<string, string>,
): ChangesRecord | null {
  const changes: ChangesRecord = {};

  for (const [key, newValue] of Object.entries(body)) {
    const previousRaw = previousValues?.[key];

    if (previousValues && String(previousRaw) === String(newValue)) continue;

    const displayLabel = MEMBER_REF_FIELDS[key];
    if (displayLabel) {
      const prevId = previousRaw ? String(previousRaw) : null;
      const newId = newValue ? String(newValue) : null;
      const prevName = prevId ? memberNames[prevId] : null;
      const newName = newId ? memberNames[newId] : null;
      changes[displayLabel] = {
        previous: prevName ? `${prevName} (${prevId})` : 'Unassigned',
        current: newName ? `${newName} (${newId})` : 'Unassigned',
      };
      continue;
    }

    const sanitizedNew = sanitizeValue(key, newValue);
    const sanitizedPrev = previousValues
      ? sanitizeValue(key, previousRaw)
      : null;
    changes[key] = { previous: sanitizedPrev, current: sanitizedNew };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export function extractEntityId(
  request: AuthenticatedRequest,
  method: string,
  responseBody: unknown,
): string | null {
  const paramId = (request as any).params?.id;
  if (paramId) return paramId;

  if (method === 'POST' && responseBody && typeof responseBody === 'object') {
    const body = responseBody as Record<string, unknown>;
    if (typeof body.id === 'string') return body.id;
    if (body.data && typeof body.data === 'object') {
      const data = body.data as Record<string, unknown>;
      if (typeof data.id === 'string') return data.id;
    }
  }

  return null;
}
