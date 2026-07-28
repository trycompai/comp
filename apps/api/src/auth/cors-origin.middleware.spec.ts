import type { NextFunction, Request, Response } from 'express';
import { isTrustedOrigin } from './auth.server';
import { corsOriginMiddleware } from './cors-origin.middleware';

jest.mock('./auth.server', () => ({
  isTrustedOrigin: jest.fn(),
}));

type MockResponse = Partial<Response> & {
  body?: unknown;
  headers: Record<string, string>;
  statusCode?: number;
  varied: string[];
};

const extensionOrigin =
  'chrome-extension://abcdefghijklmnopabcdefghijklmnop';

function createRequest(params: {
  method: string;
  path: string;
  origin?: string;
  requestedMethod?: string;
  requestedHeaders?: string;
}): Partial<Request> {
  return {
    method: params.method,
    path: params.path,
    headers: {
      ...(params.origin ? { origin: params.origin } : {}),
      ...(params.requestedMethod
        ? { 'access-control-request-method': params.requestedMethod }
        : {}),
      ...(params.requestedHeaders
        ? { 'access-control-request-headers': params.requestedHeaders }
        : {}),
    },
  };
}

function createResponse(): MockResponse {
  const response = {
    headers: {},
    varied: [],
  } as MockResponse;
  response.vary = jest.fn().mockImplementation((field: string) => {
    response.varied.push(field);
    return response;
  });
  response.setHeader = jest
    .fn()
    .mockImplementation((name: string, value: string) => {
      response.headers[name] = value;
      return response;
    });
  response.status = jest.fn().mockImplementation((statusCode: number) => {
    response.statusCode = statusCode;
    return response;
  });
  response.send = jest.fn().mockImplementation((body?: unknown) => {
    response.body = body;
    return response;
  });
  return response;
}

function runCors(params: {
  request: Partial<Request>;
  response: MockResponse;
  next: NextFunction;
}): void {
  corsOriginMiddleware(
    params.request as Request,
    params.response as Response,
    params.next,
  );
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('corsOriginMiddleware', () => {
  const originalExtensionOrigins = process.env.COMP_EXTENSION_TRUSTED_ORIGINS;

  beforeEach(() => {
    process.env.COMP_EXTENSION_TRUSTED_ORIGINS = extensionOrigin;
    jest.mocked(isTrustedOrigin).mockResolvedValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalExtensionOrigins === undefined) {
      delete process.env.COMP_EXTENSION_TRUSTED_ORIGINS;
      return;
    }
    process.env.COMP_EXTENSION_TRUSTED_ORIGINS = originalExtensionOrigins;
  });

  it('allows configured extension origins on extension paths', async () => {
    const request = createRequest({
      method: 'OPTIONS',
      origin: extensionOrigin,
      path: '/v1/questionnaire/answer-single',
      requestedMethod: 'POST',
      requestedHeaders: 'Content-Type',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBe(
      extensionOrigin,
    );
    expect(response.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not allow configured extension origins with wrong methods', async () => {
    const request = createRequest({
      method: 'OPTIONS',
      origin: extensionOrigin,
      path: '/v1/auth/me',
      requestedMethod: 'POST',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not allow configured extension origins on unrelated paths', async () => {
    const request = createRequest({
      method: 'OPTIONS',
      origin: extensionOrigin,
      path: '/v1/controls',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not allow unknown extension origins on extension paths', async () => {
    const request = createRequest({
      method: 'OPTIONS',
      origin: 'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      path: '/v1/auth/me',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows normal trusted origins on any API path', async () => {
    jest.mocked(isTrustedOrigin).mockResolvedValue(true);
    const request = createRequest({
      method: 'GET',
      origin: 'https://app.trycomp.ai',
      path: '/v1/controls',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBe(
      'https://app.trycomp.ai',
    );
    expect(response.varied).toContain('Origin');
    expect(next).toHaveBeenCalled();
  });

  it('advertises every method the previous enableCors config allowed', async () => {
    jest.mocked(isTrustedOrigin).mockResolvedValue(true);
    const request = createRequest({
      method: 'OPTIONS',
      origin: 'https://app.trycomp.ai',
      path: '/v1/controls',
      requestedMethod: 'GET',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    const allowed = (response.headers['Access-Control-Allow-Methods'] ?? '')
      .split(',');
    for (const method of ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']) {
      expect(allowed).toContain(method);
    }
  });

  it('varies on origin even when the origin is rejected, so caches cannot mix responses', async () => {
    jest.mocked(isTrustedOrigin).mockResolvedValue(false);
    const request = createRequest({
      method: 'GET',
      origin: 'https://untrusted.example',
      path: '/v1/controls',
    });
    const response = createResponse();
    const next = jest.fn();

    runCors({ request, response, next });
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(response.varied).toEqual([
      'Origin',
      'Access-Control-Request-Headers',
      'Access-Control-Request-Method',
    ]);
  });
});
