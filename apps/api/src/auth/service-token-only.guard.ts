import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './types';

/**
 * Guard that rejects everything except internal service-token auth.
 * Use on internal-only endpoints that return sensitive data not meant for
 * customers (e.g., minting temporary AWS credentials for background workers).
 *
 * Place between HybridAuthGuard and PermissionGuard:
 * @UseGuards(HybridAuthGuard, ServiceTokenOnlyGuard, PermissionGuard)
 */
@Injectable()
export class ServiceTokenOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.isServiceToken) {
      throw new ForbiddenException(
        'This endpoint is only available for internal service-token requests.',
      );
    }

    return true;
  }
}
