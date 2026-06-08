import type { NextFunction, Request, Response } from 'express';
import { isTrustedOrigin } from './auth.server';
import { isCompExtensionOriginAllowedForRequest } from './origin-policy';

const CORS_METHODS = 'GET,POST,PUT,DELETE,PATCH,OPTIONS';
const DEFAULT_CORS_HEADERS =
  'Content-Type,Authorization,X-API-Key,X-Service-Token,X-Organization-Id';

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function setCorsHeaders(params: {
  request: Request;
  response: Response;
  origin: string;
}): void {
  const requestedHeaders = getHeaderValue(
    params.request.headers['access-control-request-headers'],
  );
  params.response.setHeader('Access-Control-Allow-Origin', params.origin);
  params.response.setHeader('Access-Control-Allow-Credentials', 'true');
  params.response.setHeader('Access-Control-Allow-Methods', CORS_METHODS);
  params.response.setHeader(
    'Access-Control-Allow-Headers',
    requestedHeaders ?? DEFAULT_CORS_HEADERS,
  );
  params.response.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
}

async function isCorsOriginAllowed(params: {
  method: string;
  origin: string;
  path: string;
}): Promise<boolean> {
  if (isCompExtensionOriginAllowedForRequest(params)) return true;
  return isTrustedOrigin(params.origin);
}

function endPreflight(response: Response): void {
  response.status(204).send();
}

export function corsOriginMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const origin = getHeaderValue(request.headers.origin);
  const requestedMethod = getHeaderValue(
    request.headers['access-control-request-method'],
  );
  const method =
    request.method === 'OPTIONS' && requestedMethod
      ? requestedMethod
      : request.method;
  if (!origin) {
    if (request.method === 'OPTIONS') {
      endPreflight(response);
      return;
    }
    next();
    return;
  }

  isCorsOriginAllowed({ method, origin, path: request.path })
    .then((allowed) => {
      if (allowed) {
        setCorsHeaders({ request, response, origin });
      }
      if (request.method === 'OPTIONS') {
        endPreflight(response);
        return;
      }
      next();
    })
    .catch(() => {
      if (request.method === 'OPTIONS') {
        endPreflight(response);
        return;
      }
      next();
    });
}
