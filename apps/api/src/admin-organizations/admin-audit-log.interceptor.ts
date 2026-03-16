import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { AuditLogEntityType, db, Prisma } from '@db';
import { Observable, tap } from 'rxjs';
import { MUTATION_METHODS, SENSITIVE_KEYS } from '../audit/audit-log.constants';

const SEGMENT_TO_RESOURCE: Record<
  string,
  { entity: AuditLogEntityType; singular: string }
> = {
  findings: { entity: AuditLogEntityType.finding, singular: 'finding' },
  policies: { entity: AuditLogEntityType.policy, singular: 'policy' },
  tasks: { entity: AuditLogEntityType.task, singular: 'task' },
  vendors: { entity: AuditLogEntityType.vendor, singular: 'vendor' },
  context: { entity: AuditLogEntityType.organization, singular: 'context' },
};

const SPECIAL_ACTION_DESCRIPTIONS: Record<string, string> = {
  activate: 'Activated organization',
  deactivate: 'Deactivated organization',
  invite: 'Invited member to organization',
  regenerate: 'Regenerated policy content',
  'trigger-assessment': 'Triggered vendor risk assessment',
};

type Changes = Record<string, { previous: unknown; current: unknown }>;

interface ParsedPath {
  resource: string;
  entityType: AuditLogEntityType | null;
  entityId: string | null;
  actionSegment: string | null;
}

@Injectable()
export class AdminAuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const organizationId: string | undefined =
      request.params?.orgId ?? request.params?.id;
    const userId: string | undefined = request.userId;

    if (!organizationId || !userId) {
      this.logger.warn(
        `Admin audit log skipped for ${method} ${request.url}: ` +
          `missing ${!organizationId ? 'organizationId' : 'userId'}`,
      );
      return next.handle();
    }

    const parsed = this.parsePath(request.url, organizationId);
    const body = request.body as Record<string, unknown> | undefined;
    const changes = body ? this.sanitizeBody(body) : null;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.persistWithName({
            organizationId,
            userId,
            method,
            path: request.url,
            parsed,
            changes,
          }).catch((err) => {
            this.logger.error('Failed to write admin audit log', err);
          });
        },
        error: (err: Error) => {
          void this.persistWithName({
            organizationId,
            userId,
            method,
            path: request.url,
            parsed,
            changes: {
              ...(changes ?? {}),
              _failed: { previous: null, current: err.message },
            },
          }).catch((logErr) => {
            this.logger.error(
              'Failed to write admin audit log for failed request',
              logErr,
            );
          });
        },
      }),
    );
  }

  private parsePath(url: string, orgId: string): ParsedPath {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const orgIndex = segments.indexOf(orgId);

    if (orgIndex === -1) {
      return {
        resource: 'organization',
        entityType: AuditLogEntityType.organization,
        entityId: orgId,
        actionSegment: null,
      };
    }

    const resourceSegment = segments[orgIndex + 1];
    const possibleEntityId = segments[orgIndex + 2];
    const actionSegment = segments[orgIndex + 3] ?? null;

    if (!resourceSegment || SPECIAL_ACTION_DESCRIPTIONS[resourceSegment]) {
      return {
        resource: 'organization',
        entityType: AuditLogEntityType.organization,
        entityId: orgId,
        actionSegment: resourceSegment ?? null,
      };
    }

    if (resourceSegment === 'invitations') {
      return {
        resource: 'organization',
        entityType: AuditLogEntityType.organization,
        entityId: orgId,
        actionSegment: 'invitations',
      };
    }

    const mapped = SEGMENT_TO_RESOURCE[resourceSegment];

    return {
      resource: mapped?.singular ?? resourceSegment,
      entityType: mapped?.entity ?? null,
      entityId: possibleEntityId ?? null,
      actionSegment: actionSegment,
    };
  }

  private buildDescription(
    method: string,
    parsed: ParsedPath,
    entityName: string | null,
  ): string {
    if (
      parsed.actionSegment &&
      SPECIAL_ACTION_DESCRIPTIONS[parsed.actionSegment]
    ) {
      const base = SPECIAL_ACTION_DESCRIPTIONS[parsed.actionSegment];
      return entityName ? `${base} '${entityName}'` : base;
    }

    if (parsed.actionSegment === 'invitations' && method === 'DELETE') {
      return 'Revoked organization invitation';
    }

    const verb: Record<string, string> = {
      POST: 'Created',
      PATCH: 'Updated',
      PUT: 'Updated',
      DELETE: 'Deleted',
    };

    const action = `${verb[method] ?? 'Modified'} ${parsed.resource}`;
    return entityName ? `${action} '${entityName}'` : action;
  }

  private async resolveEntityName(
    resource: string,
    entityId: string | null,
    organizationId: string,
  ): Promise<string | null> {
    if (!entityId) return null;

    try {
      switch (resource) {
        case 'policy': {
          const p = await db.policy.findFirst({
            where: { id: entityId, organizationId },
            select: { name: true },
          });
          return p?.name ?? null;
        }
        case 'task': {
          const t = await db.task.findFirst({
            where: { id: entityId, organizationId },
            select: { title: true },
          });
          return t?.title ?? null;
        }
        case 'vendor': {
          const v = await db.vendor.findFirst({
            where: { id: entityId, organizationId },
            select: { name: true },
          });
          return v?.name ?? null;
        }
        case 'finding': {
          const f = await db.finding.findFirst({
            where: { id: entityId, organizationId },
            select: { template: { select: { title: true } } },
          });
          return f?.template?.title ?? null;
        }
        case 'context': {
          const c = await db.context.findFirst({
            where: { id: entityId, organizationId },
            select: { question: true },
          });
          if (!c?.question) return null;
          return c.question.length > 60
            ? `${c.question.slice(0, 57)}...`
            : c.question;
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private sanitizeBody(body: Record<string, unknown>): Changes | null {
    const changes: Changes = {};

    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || SENSITIVE_KEYS.has(key)) continue;
      changes[key] = { previous: null, current: value };
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  private async persistWithName(params: {
    organizationId: string;
    userId: string;
    method: string;
    path: string;
    parsed: ParsedPath;
    changes: Changes | null;
  }): Promise<void> {
    const entityName = await this.resolveEntityName(
      params.parsed.resource,
      params.parsed.entityId,
      params.organizationId,
    );
    const description = this.buildDescription(
      params.method,
      params.parsed,
      entityName,
    );

    const auditData: Record<string, unknown> = {
      action: description,
      method: params.method,
      path: params.path,
      resource: 'admin',
      permission: 'platform-admin',
    };

    if (params.changes) {
      auditData.changes = params.changes;
    }

    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        memberId: null,
        entityType: params.parsed.entityType,
        entityId: params.parsed.entityId,
        description,
        data: auditData as Prisma.InputJsonValue,
      },
    });
  }
}
