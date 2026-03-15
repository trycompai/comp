import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './types';

/**
 * Guard that rejects API key and service token auth.
 * Use on endpoints that require a real user session (e.g., assistant chat).
 *
 * Place between HybridAuthGuard and PermissionGuard:
 * @UseGuards(HybridAuthGuard, SessionOnlyGuard, PermissionGuard)
 */
@Injectable()
export class SessionOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.isApiKey || request.isServiceToken) {
      throw new ForbiddenException(
        'This endpoint is only available for user-authenticated requests.',
      );
    }

    return true;
  }
}
