import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
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
          this.logger.log(
            JSON.stringify({
              type: 'platform-admin-audit',
              userId,
              action,
              method,
              path: request.url,
              providerSlug,
              timestamp: new Date().toISOString(),
            }),
          );
        },
        error: (err: Error) => {
          this.logger.warn(
            JSON.stringify({
              type: 'platform-admin-audit',
              userId,
              action,
              method,
              path: request.url,
              providerSlug,
              timestamp: new Date().toISOString(),
              failed: true,
              error: err.message,
            }),
          );
        },
      }),
    );
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
