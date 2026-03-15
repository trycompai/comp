import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { auth } from './auth.server';

interface PlatformAdminRequest {
  userId?: string;
  userEmail?: string;
  isPlatformAdmin?: boolean;
  headers: {
    authorization?: string;
    cookie?: string;
    [key: string]: string | undefined;
  };
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PlatformAdminRequest>();
    const authHeader = request.headers['authorization'];

    // Check for INTERNAL_API_SECRET Bearer token (CLI / service auth)
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const secret = process.env.INTERNAL_API_SECRET;

      if (secret && token.length > 0) {
        const tokenBuffer = Buffer.from(token);
        const secretBuffer = Buffer.from(secret);

        if (
          tokenBuffer.length === secretBuffer.length &&
          timingSafeEqual(tokenBuffer, secretBuffer)
        ) {
          request.userId = 'system-admin';
          request.userEmail = 'admin@internal';
          request.isPlatformAdmin = true;
          return true;
        }
      }
      // Don't return here — fall through to session-based auth
      // since better-auth also uses Bearer tokens
    }

    // Build headers for better-auth SDK
    const headers = new Headers();
    if (authHeader) {
      headers.set('authorization', authHeader);
    }
    const cookieHeader = request.headers['cookie'];
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    if (!authHeader && !cookieHeader) {
      throw new UnauthorizedException(
        'Platform admin routes require authentication',
      );
    }

    // Resolve session via better-auth SDK
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Fetch user from database to check isPlatformAdmin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        isPlatformAdmin: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

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
}
