import { corsOriginMiddleware } from './cors-origin.middleware';
import { isTrustedOrigin } from './auth.server';
import { isStaticTrustedOrigin } from './origin-policy';
import type { NextFunction, Request, Response } from 'express';

jest.mock('./auth.server', () => ({ isTrustedOrigin: jest.fn() }));

/**
 * The four classes of origin that reach the production API. The CORS layer was
 * rewritten to support the questionnaire extension, so these assert the
 * existing apps kept working rather than testing anything new.
 */
const APP = 'https://app.trycomp.ai';
const PORTAL = 'https://portal.trycomp.ai';
const SUBDOMAIN = 'https://anything.trycomp.ai';
// A customer's own trust-portal domain: not a trycomp.ai host, so it is only
// ever allowed by the Redis/DB-backed lookup inside isTrustedOrigin.
const CUSTOM_DOMAIN = 'https://trust.acmecorp.com';

function createRequest(origin: string): Partial<Request> {
  return { method: 'GET', path: '/v1/controls', headers: { origin } };
}

function createResponse(): Partial<Response> & { headers: Record<string, string> } {
  const response: Partial<Response> & { headers: Record<string, string> } = {
    headers: {},
  };
  response.vary = jest.fn().mockReturnValue(response);
  response.setHeader = jest.fn().mockImplementation((key: string, value: string) => {
    response.headers[key] = value;
    return response;
  });
  response.status = jest.fn().mockReturnValue(response);
  response.send = jest.fn().mockReturnValue(response);
  return response;
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('production origins still pass CORS', () => {
  it.each([
    ['the app', APP],
    ['the portal', PORTAL],
    ['an arbitrary trycomp.ai subdomain', SUBDOMAIN],
    ['a customer custom domain', CUSTOM_DOMAIN],
  ])('allows %s', async (_label, origin) => {
    jest.mocked(isTrustedOrigin).mockResolvedValue(true);
    const response = createResponse();
    const next: NextFunction = jest.fn();

    corsOriginMiddleware(
      createRequest(origin) as Request,
      response as Response,
      next,
    );
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBe(origin);
    expect(response.headers['Access-Control-Allow-Credentials']).toBe('true');
    expect(next).toHaveBeenCalled();
  });

  it('rejects an untrusted origin', async () => {
    jest.mocked(isTrustedOrigin).mockResolvedValue(false);
    const response = createResponse();
    const next: NextFunction = jest.fn();

    corsOriginMiddleware(
      createRequest('https://evil.example') as Request,
      response as Response,
      next,
    );
    await flushPromises();

    expect(response.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });
});

describe('the API resolves origins without AUTH_TRUSTED_ORIGINS', () => {
  // Production does not supply AUTH_TRUSTED_ORIGINS to the API, so the built-in
  // default list applies. These must not depend on that variable being set.
  beforeEach(() => {
    delete process.env.AUTH_TRUSTED_ORIGINS;
  });

  it.each([APP, PORTAL, SUBDOMAIN, 'https://api.trycomp.ai'])(
    'trusts %s from the default list',
    (origin) => {
      expect(isStaticTrustedOrigin(origin)).toBe(true);
    },
  );

  it('does not extend the wildcard to plain HTTP', () => {
    expect(isStaticTrustedOrigin('http://anything.trycomp.ai')).toBe(false);
  });
});
