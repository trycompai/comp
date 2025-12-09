import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch(HttpException)
export class CorsExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the request origin
    const origin = request.headers.origin;

    // Set CORS headers on error responses
    if (origin) {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'https://app.trycomp.ai',
        'https://trycomp.ai',
        process.env.APP_URL,
      ].filter(Boolean) as string[];

      const isAllowed =
        allowedOrigins.includes(origin) ||
        (isDevelopment &&
          (origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('ngrok')));

      if (isAllowed) {
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
    }

    response.status(status).json(exception.getResponse());
  }
}
