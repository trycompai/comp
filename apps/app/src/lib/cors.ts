import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration for API routes
 */
export const corsConfig = {
  // Configure allowed origins based on environment
  allowedOrigins: [
    // Development origins
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // Production origins
    'https://portal.trycomp.ai',
    'https://app.trycomp.ai',
    'https://trycomp.ai',
    // Staging origins
    'https://portal.staging.trycomp.ai',
    'https://app.staging.trycomp.ai',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-pathname',
    'Cache-Control',
  ],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Add CORS headers to a NextResponse
 */
export function addCorsHeaders(response: NextResponse, origin?: string | null): NextResponse {
  // Check if origin is allowed
  const isAllowedOrigin =
    !origin ||
    corsConfig.allowedOrigins.includes(origin) ||
    corsConfig.allowedOrigins.includes('*');

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
  }

  response.headers.set('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Allow-Credentials', corsConfig.allowCredentials.toString());
  response.headers.set('Access-Control-Max-Age', corsConfig.maxAge.toString());

  return response;
}

/**
 * Handle CORS preflight requests (OPTIONS)
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 200 });

  return addCorsHeaders(response, origin);
}

/**
 * Create a CORS-enabled response
 */
export function corsResponse(
  data: any,
  options: ResponseInit = {},
  request?: NextRequest,
): NextResponse {
  const response = NextResponse.json(data, options);
  const origin = request?.headers.get('origin');

  return addCorsHeaders(response, origin);
}

/**
 * Higher-order function to wrap API handlers with CORS support
 */
export function withCors<T extends (...args: any[]) => Promise<NextResponse>>(handler: T): T {
  return (async (...args: any[]) => {
    const [request] = args;
    const origin = request?.headers?.get?.('origin');

    try {
      const response = await handler(...args);
      return addCorsHeaders(response, origin);
    } catch (error) {
      const errorResponse = NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      return addCorsHeaders(errorResponse, origin);
    }
  }) as T;
}
