import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = process.env.INTERNAL_API_TOKEN;

    // In production, we require the token to be configured.
    if (!expectedToken) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('INTERNAL_API_TOKEN is not configured in production');
        throw new UnauthorizedException('Internal access is not configured');
      }

      // In local/dev, allow requests if not configured to keep DX smooth.
      this.logger.warn(
        'INTERNAL_API_TOKEN is not configured; allowing internal request in non-production',
      );
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithHeaders>();
    const headerValue = req.headers['x-internal-token'];
    const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!token || token !== expectedToken) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return true;
  }
}
