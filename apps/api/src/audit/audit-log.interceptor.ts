import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogEntityType, db, Prisma } from '@db';
import { Observable, from, switchMap, tap } from 'rxjs';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '../auth/permission.guard';
import { AuthenticatedRequest } from '../auth/types';
import { SKIP_AUDIT_LOG_KEY } from './skip-audit-log.decorator';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'credential',
  'credentials',
  'privateKey',
  'private_key',
]);

const RESOURCE_TO_ENTITY_TYPE: Record<string, AuditLogEntityType | null> = {
  organization: AuditLogEntityType.organization,
  member: AuditLogEntityType.people,
  invitation: AuditLogEntityType.people,
  control: AuditLogEntityType.control,
  evidence: AuditLogEntityType.task,
  policy: AuditLogEntityType.policy,
  risk: AuditLogEntityType.risk,
  vendor: AuditLogEntityType.vendor,
  task: AuditLogEntityType.task,
  framework: AuditLogEntityType.framework,
  finding: AuditLogEntityType.finding,
  integration: AuditLogEntityType.integration,
  portal: AuditLogEntityType.trust,
  app: AuditLogEntityType.organization,
  questionnaire: AuditLogEntityType.organization,
  audit: null,
};

// Maps @RequirePermission resource names to Prisma model accessors on `db`
const RESOURCE_TO_PRISMA_MODEL: Record<string, string> = {
  policy: 'policy',
  vendor: 'vendor',
  risk: 'risk',
  control: 'control',
  finding: 'finding',
  organization: 'organization',
  member: 'member',
  framework: 'frameworkInstance',
  task: 'taskItem',
  portal: 'trust',
};

function buildDescription(method: string, action: string, resource: string): string {
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
      const capitalizedAction = action.charAt(0).toUpperCase() + action.slice(1);
      return `${capitalizedAction} ${resource}`;
    }
  }
}

function sanitizeValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return '[REDACTED]';
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object' && !Array.isArray(value)) return '[Object]';
  return value;
}

/**
 * Fetches the current values of the given fields from the database
 * for before/after diffing. Returns null if the model or entity isn't found.
 */
async function fetchCurrentValues(
  resource: string,
  entityId: string,
  fieldNames: string[],
): Promise<Record<string, unknown> | null> {
  const modelName = RESOURCE_TO_PRISMA_MODEL[resource];
  if (!modelName) return null;

  const model = (db as any)[modelName];
  if (!model?.findUnique) return null;

  const select: Record<string, boolean> = {};
  for (const field of fieldNames) {
    select[field] = true;
  }

  try {
    return await model.findUnique({ where: { id: entityId }, select });
  } catch {
    // Field might not exist on the model — that's fine
    return null;
  }
}

/**
 * Builds a changes record by comparing request body values against
 * the entity's previous state. Only includes fields that actually changed.
 */
function buildChanges(
  body: Record<string, unknown>,
  previousValues: Record<string, unknown> | null,
): Record<string, { previous: unknown; current: unknown }> | null {
  const changes: Record<string, { previous: unknown; current: unknown }> = {};

  for (const [key, newValue] of Object.entries(body)) {
    const sanitizedNew = sanitizeValue(key, newValue);
    const previousRaw = previousValues?.[key];
    const sanitizedPrev = previousValues ? sanitizeValue(key, previousRaw) : null;

    // If we have previous values, only log fields that actually changed
    if (previousValues) {
      // Compare stringified to handle type coercion (e.g., Date vs string)
      if (String(previousRaw) === String(newValue)) continue;
    }

    changes[key] = { previous: sanitizedPrev, current: sanitizedNew };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

function extractEntityId(
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

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const skipAuditLog = this.reflector.getAllAndOverride<boolean>(
      SKIP_AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipAuditLog) {
      return next.handle();
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredPermissions?.length) {
      return next.handle();
    }

    const { organizationId, userId, memberId } = request;
    if (!organizationId || !userId) {
      return next.handle();
    }

    const permission = requiredPermissions[0];
    const resource = permission.resource;
    const action = permission.actions[0];

    if (resource === 'audit') {
      return next.handle();
    }

    const requestBody = (request as any).body as Record<string, unknown> | undefined;
    const entityId = (request as any).params?.id as string | undefined;

    // For updates with a body and entity ID, fetch current state before the handler runs
    const isUpdate = (method === 'PATCH' || method === 'PUT') && requestBody && entityId;

    const previousValuesPromise = isUpdate
      ? fetchCurrentValues(resource, entityId, Object.keys(requestBody))
      : Promise.resolve(null);

    return from(previousValuesPromise).pipe(
      switchMap((previousValues) =>
        next.handle().pipe(
          tap({
            next: (responseBody) => {
              const changes = requestBody
                ? buildChanges(requestBody, previousValues)
                : null;

              void this.createAuditLog(
                organizationId,
                userId,
                memberId,
                method,
                request.url,
                resource,
                action,
                request,
                responseBody,
                changes,
              ).catch((err) => {
                this.logger.error('Failed to create audit log entry', err);
              });
            },
          }),
        ),
      ),
    );
  }

  private async createAuditLog(
    organizationId: string,
    userId: string,
    memberId: string | undefined,
    method: string,
    path: string,
    resource: string,
    action: string,
    request: AuthenticatedRequest,
    responseBody: unknown,
    changes: Record<string, { previous: unknown; current: unknown }> | null,
  ): Promise<void> {
    const entityType = RESOURCE_TO_ENTITY_TYPE[resource] ?? null;
    const entityId = extractEntityId(request, method, responseBody);
    const description = buildDescription(method, action, resource);

    const auditData: Record<string, unknown> = {
      action: description,
      method,
      path,
      resource,
      permission: action,
    };
    if (changes) {
      auditData.changes = changes;
    }

    await db.auditLog.create({
      data: {
        organizationId,
        userId,
        memberId: memberId ?? null,
        entityType,
        entityId,
        description,
        data: auditData as Prisma.InputJsonValue,
      },
    });
  }
}
