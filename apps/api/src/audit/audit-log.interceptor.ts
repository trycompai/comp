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
import { AUDIT_READ_KEY, SKIP_AUDIT_LOG_KEY } from './skip-audit-log.decorator';
import {
  MEMBER_REF_FIELDS,
  MUTATION_METHODS,
  RESOURCE_TO_ENTITY_TYPE,
} from './audit-log.constants';
import {
  type AuditContextOverride,
  type ChangesRecord,
  buildChanges,
  buildDescription,
  extractCommentContext,
  extractDownloadDescription,
  extractEntityId,
  extractPolicyActionDescription,
  extractVersionDescription,
} from './audit-log.utils';
import {
  buildRelationMappingChanges,
  fetchCurrentValues,
  resolveMemberNames,
} from './audit-log.resolvers';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method;

    const isAuditRead = this.reflector.getAllAndOverride<boolean>(
      AUDIT_READ_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!MUTATION_METHODS.has(method) && !isAuditRead) {
      return next.handle();
    }

    if (this.shouldSkip(context)) {
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

    const { resource, actions } = requiredPermissions[0];
    const action = actions[0];

    if (resource === 'audit') {
      return next.handle();
    }

    const requestBody = (request as any).body as
      | Record<string, unknown>
      | undefined;
    const entityId = (request as any).params?.id as string | undefined;
    const isUpdate =
      (method === 'PATCH' || method === 'PUT') && requestBody && entityId;

    const preFlightPromise = this.preflight(
      request.url,
      method,
      resource,
      requestBody,
      entityId,
      isUpdate ? Object.keys(requestBody) : null,
    );

    return from(preFlightPromise).pipe(
      switchMap(({ previousValues, memberNames, relationMappingResult }) =>
        next.handle().pipe(
          tap({
            next: (responseBody) => {
              const commentCtx = extractCommentContext(
                request.url,
                method,
                requestBody,
              );

              let changes: ChangesRecord | null;
              const versionDesc = extractVersionDescription(
                request.url,
                method,
                responseBody,
              );
              const downloadDesc = extractDownloadDescription(
                request.url,
                method,
              );
              const policyActionDesc = extractPolicyActionDescription(
                request.url,
                method,
                requestBody,
              );
              let descriptionOverride: string | null =
                versionDesc ?? downloadDesc ?? policyActionDesc;

              if (commentCtx || versionDesc || policyActionDesc) {
                // Comments and version operations don't produce meaningful diffs
                changes = null;
              } else if (relationMappingResult) {
                changes = relationMappingResult.changes;
                descriptionOverride ??= relationMappingResult.description;
              } else {
                changes = requestBody
                  ? buildChanges(requestBody, previousValues, memberNames)
                  : null;
              }

              void this.persist(
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
                commentCtx,
                descriptionOverride,
              ).catch((err) => {
                this.logger.error('Failed to create audit log entry', err);
              });
            },
          }),
        ),
      ),
    );
  }

  private shouldSkip(context: ExecutionContext): boolean {
    return !!this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private async preflight(
    url: string,
    method: string,
    resource: string,
    requestBody: Record<string, unknown> | undefined,
    entityId: string | undefined,
    updateFieldNames: string[] | null,
  ) {
    const previousValues =
      updateFieldNames && entityId
        ? await fetchCurrentValues(resource, entityId, updateFieldNames)
        : null;

    const memberIds = new Set<string>();
    if (requestBody) {
      for (const field of Object.keys(MEMBER_REF_FIELDS)) {
        const newVal = requestBody[field];
        if (typeof newVal === 'string' && newVal) memberIds.add(newVal);
        const prevVal = previousValues?.[field];
        if (typeof prevVal === 'string' && prevVal) memberIds.add(prevVal);
      }
    }
    const memberNames = await resolveMemberNames([...memberIds]);

    const relationMappingResult = await buildRelationMappingChanges(
      url,
      method,
      requestBody,
      entityId,
    );

    return { previousValues, memberNames, relationMappingResult };
  }

  private async persist(
    organizationId: string,
    userId: string,
    memberId: string | undefined,
    method: string,
    path: string,
    resource: string,
    action: string,
    request: AuthenticatedRequest,
    responseBody: unknown,
    changes: ChangesRecord | null,
    commentContext: AuditContextOverride | null,
    descriptionOverride: string | null,
  ): Promise<void> {
    const entityType =
      commentContext?.entityType ?? RESOURCE_TO_ENTITY_TYPE[resource] ?? null;
    const entityId =
      commentContext?.entityId ?? extractEntityId(request, method, responseBody);
    const description =
      commentContext?.description ??
      descriptionOverride ??
      buildDescription(method, action, resource);

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
