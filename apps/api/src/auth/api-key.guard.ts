import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from './api-key.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract API key from X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'] as string;

    const apiKey = this.apiKeyService.extractApiKey(apiKeyHeader);

    if (!apiKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    // Validate the API key
    const result = await this.apiKeyService.validateApiKey(apiKey);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach the organization ID and scopes to the request for use in controllers
    (request as any).organizationId = result.organizationId;
    (request as any).apiKeyScopes = result.scopes;

    return true;
  }
}
