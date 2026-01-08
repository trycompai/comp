import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '@trycompai/db';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { BetterAuthConfig } from '../config/better-auth.config';
import type { AuthenticatedRequest } from './types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly betterAuthUrl: string;

  constructor(private readonly configService: ConfigService) {
    const betterAuthConfig =
      this.configService.get<BetterAuthConfig>('betterAuth');
    this.betterAuthUrl =
      betterAuthConfig?.url || process.env.BETTER_AUTH_URL || '';

    if (!this.betterAuthUrl) {
      console.warn(
        '[JwtAuthGuard] BETTER_AUTH_URL not configured. JWT authentication will fail.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authHeader = request.headers['authorization'] as string;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer JWT token required');
    }

    return this.handleJwtAuth(request, authHeader);
  }

  private async handleJwtAuth(
    request: AuthenticatedRequest,
    authHeader: string,
  ): Promise<boolean> {
    try {
      if (!this.betterAuthUrl) {
        throw new UnauthorizedException(
          'Authentication configuration error: BETTER_AUTH_URL not configured',
        );
      }

      const token = authHeader.substring(7);
      const jwksUrl = `${this.betterAuthUrl}/api/auth/jwks`;
      const JWKS = createRemoteJWKSet(new URL(jwksUrl), {
        cacheMaxAge: 60000,
        cooldownDuration: 10000,
      });

      let payload;
      try {
        payload = (
          await jwtVerify(token, JWKS, {
            issuer: this.betterAuthUrl,
            audience: this.betterAuthUrl,
          })
        ).payload;
      } catch (verifyError: any) {
        if (
          verifyError.code === 'ERR_JWKS_NO_MATCHING_KEY' ||
          verifyError.message?.includes('no applicable key found') ||
          verifyError.message?.includes('JWKSNoMatchingKey')
        ) {
          const freshJWKS = createRemoteJWKSet(new URL(jwksUrl), {
            cacheMaxAge: 0,
            cooldownDuration: 0,
          });
          payload = (
            await jwtVerify(token, freshJWKS, {
              issuer: this.betterAuthUrl,
              audience: this.betterAuthUrl,
            })
          ).payload;
        } else {
          throw verifyError;
        }
      }

      const userId = payload.id as string;
      const userEmail = payload.email as string;

      if (!userId) {
        throw new UnauthorizedException(
          'Invalid JWT payload: missing user information',
        );
      }

      request.userId = userId;
      request.userEmail = userEmail;
      request.authType = 'jwt';
      request.isApiKey = false;

      // Optional org context: validate if present
      const explicitOrgId = request.headers['x-organization-id'] as
        | string
        | undefined;
      if (explicitOrgId) {
        const hasAccess = await this.verifyUserOrgAccess(userId, explicitOrgId);
        if (!hasAccess) {
          throw new UnauthorizedException(
            `User does not have access to organization: ${explicitOrgId}`,
          );
        }
        request.organizationId = explicitOrgId;
      }

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private async verifyUserOrgAccess(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    const member = await db.member.findFirst({
      where: {
        userId,
        organizationId,
        deactivated: false,
      },
      select: { id: true },
    });
    return !!member;
  }
}
