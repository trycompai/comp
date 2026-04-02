import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { db } from '@db';
import { Observable, tap } from 'rxjs';
import { MUTATION_METHODS } from '../../audit/audit-log.constants';

@Injectable()
export class PlatformAuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('PlatformAuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    if (!MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const userId: string | undefined = request.userId;
    if (!userId) {
      this.logger.warn(
        `Platform audit log skipped for ${method} ${request.url}: missing userId`,
      );
      return next.handle();
    }

    const providerSlug = this.extractProviderSlug(request);
    const action = this.describeAction(method, providerSlug);

    return next.handle().pipe(
      tap({
        next: () => {
          void this.persistAuditEntry(userId, action, method, request.url, providerSlug, false);
        },
        error: (err: Error) => {
          void this.persistAuditEntry(userId, action, method, request.url, providerSlug, true, err.message);
        },
      }),
    );
  }

  private async persistAuditEntry(
    userId: string,
    action: string,
    method: string,
    path: string,
    providerSlug: string | null,
    failed: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const logPayload = {
      type: 'platform-admin-audit',
      userId,
      action,
      method,
      path,
      providerSlug,
      timestamp: new Date().toISOString(),
      ...(failed && { failed: true, error: errorMessage }),
    };

    if (failed) {
      this.logger.warn(JSON.stringify(logPayload));
    } else {
      this.logger.log(JSON.stringify(logPayload));
    }

    try {
      const userOrg = await db.organization.findFirst({
        where: { members: { some: { userId } } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      await db.auditLog.create({
        data: {
          userId,
          memberId: null,
          organizationId: userOrg?.id ?? 'platform',
          entityType: 'integration',
          entityId: providerSlug,
          description: `[Platform Admin] ${action}${failed ? ' (failed)' : ''}`,
          data: {
            action,
            method,
            path,
            resource: 'admin',
            permission: 'platform-admin',
            providerSlug,
            ...(failed && { failed: true, error: errorMessage }),
          },
        },
      });
    } catch (err) {
      this.logger.error('Failed to persist platform audit log entry:', err);
    }
  }

  private extractProviderSlug(request: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  }): string | null {
    return (
      request.params?.providerSlug ??
      (request.body?.providerSlug as string | undefined) ??
      null
    );
  }

  private describeAction(method: string, providerSlug: string | null): string {
    const target = providerSlug ? ` for '${providerSlug}'` : '';

    switch (method) {
      case 'POST':
        return `Saved platform credentials${target}`;
      case 'DELETE':
        return `Deleted platform credentials${target}`;
      default:
        return `Modified platform credentials${target}`;
    }
  }
}
