import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Parameter decorator to extract the organization ID from the request
 * This should be used with the ApiKeyGuard which attaches the organizationId to the request
 */
export const Organization = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const organizationId = (request as any).organizationId;

    if (!organizationId) {
      throw new Error(
        'Organization ID not found in request. Make sure ApiKeyGuard is applied.',
      );
    }

    return organizationId;
  },
);
