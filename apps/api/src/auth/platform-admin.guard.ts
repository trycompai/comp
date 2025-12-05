import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { db } from '@trycompai/db';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { BetterAuthConfig } from '../config/better-auth.config';

interface PlatformAdminRequest {
  userId?: string;
  userEmail?: string;
  isPlatformAdmin?: boolean;
  headers: {
    authorization?: string;
    [key: string]: string | undefined;
  };
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  private readonly betterAuthUrl: string;

  constructor(private readonly configService: ConfigService) {
    const betterAuthConfig =
      this.configService.get<BetterAuthConfig>('betterAuth');
    this.betterAuthUrl =
      betterAuthConfig?.url || process.env.BETTER_AUTH_URL || '';

    if (!this.betterAuthUrl) {
      console.warn(
        '[PlatformAdminGuard] BETTER_AUTH_URL not configured. Authentication will fail.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformAdminRequest>();

    // Only accept JWT authentication for admin routes
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Platform admin routes require JWT authentication',
      );
    }

    // Verify JWT and get user
    const user = await this.verifyJwtAndGetUser(authHeader);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }

    // Check if user is a platform admin
    if (!user.isPlatformAdmin) {
      throw new ForbiddenException(
        'Access denied: Platform admin privileges required',
      );
    }

    // Set request context
    request.userId = user.id;
    request.userEmail = user.email;
    request.isPlatformAdmin = true;

    return true;
  }

  private async verifyJwtAndGetUser(authHeader: string): Promise<{
    id: string;
    email: string;
    isPlatformAdmin: boolean;
  } | null> {
    try {
      if (!this.betterAuthUrl) {
        console.error(
          '[PlatformAdminGuard] BETTER_AUTH_URL environment variable is not set',
        );
        return null;
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
      } catch (verifyError: unknown) {
        const error = verifyError as { code?: string; message?: string };
        if (
          error.code === 'ERR_JWKS_NO_MATCHING_KEY' ||
          error.message?.includes('no applicable key found')
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
      if (!userId) {
        return null;
      }

      // Fetch user from database to check isPlatformAdmin
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isPlatformAdmin: true,
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
      };
    } catch (error) {
      console.error('[PlatformAdminGuard] JWT verification failed:', error);
      return null;
    }
  }
}
