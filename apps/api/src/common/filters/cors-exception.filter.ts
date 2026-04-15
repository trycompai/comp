import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { isStaticTrustedOrigin } from '../../auth/auth.server';

@Catch(HttpException)
export class CorsExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the request origin
    const origin = request.headers.origin;

    // Set CORS headers on error responses for trusted origins.
    // Uses the sync check only — the main CORS middleware already validated
    // custom domains on the way in, so this is a best-effort fallback.
    if (origin && isStaticTrustedOrigin(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      );
      response.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization,X-API-Key,X-Organization-Id',
      );
    }

    response.status(status).json(exception.getResponse());
  }
}
