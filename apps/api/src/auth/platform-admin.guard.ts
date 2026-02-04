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

    // Build headers for better-auth SDK
    const headers = new Headers();
    const authHeader = request.headers['authorization'];
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
