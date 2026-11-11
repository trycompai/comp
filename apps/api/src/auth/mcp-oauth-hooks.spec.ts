const mockGetSessionFromCtx = jest.fn();

jest.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(
      readonly status: string,
      readonly body: Record<string, unknown>,
    ) {
      super(status);
    }
  },
  createAuthMiddleware: (handler: unknown) => handler,
  getSessionFromCtx: (...args: unknown[]) => mockGetSessionFromCtx(...args),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { mcpOAuthBeforeHook } from './mcp-oauth-hooks';

const runHook = mcpOAuthBeforeHook as unknown as (
  ctx: unknown,
) => Promise<unknown>;

const OWNER = { user: { id: 'user_1' }, session: { id: 'sess_1' } };
const OTHER_USER = { user: { id: 'user_2' }, session: { id: 'sess_2' } };

function pendingValue(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    clientId: 'client_1',
    redirectURI: 'https://client.example.com/callback',
    scope: ['openid'],
    userId: 'user_1',
    requireConsent: true,
    ...overrides,
  });
}

function makeCtx({
  path,
  body,
  query,
  cookieCode = null,
  verificationValue = null,
}: {
  path: string;
  body?: unknown;
  query?: Record<string, unknown>;
  cookieCode?: string | null;
  verificationValue?: string | null;
}) {
  return {
    path,
    body,
    query,
    getSignedCookie: jest.fn().mockResolvedValue(cookieCode),
    context: {
      secret: 'test-secret',
      internalAdapter: {
        findVerificationValue: jest
          .fn()
          .mockResolvedValue(
            verificationValue ? { value: verificationValue } : null,
          ),
      },
    },
  };
}

describe('mcpOAuthBeforeHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockGetSessionFromCtx.mockResolvedValue(OWNER);
  });

  it('ignores unrelated paths', async () => {
    const ctx = makeCtx({ path: '/sign-in/email-otp', body: {} });
    await expect(runHook(ctx)).resolves.toBeUndefined();
    expect(mockGetSessionFromCtx).not.toHaveBeenCalled();
  });

  describe('client registration', () => {
    it('refuses client registration', async () => {
      mockGetSessionFromCtx.mockResolvedValue(OWNER);
      const ctx = makeCtx({
        path: '/mcp/register',
        body: {
          redirect_uris: ['https://client.example.com/callback'],
          client_name: 'Client',
        },
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'FORBIDDEN',
        body: { error: 'access_denied' },
      });
    });
  });

  it.each([undefined, 'none', 'login', ['none', 'consent']])(
    'always asks for consent on authorization requests (prompt %p)',
    async (prompt) => {
      const query = {
        client_id: 'client_1',
        redirect_uri: 'https://client.example.com/callback',
        response_type: 'code',
        state: 'xyz',
      };

      await expect(
        runHook(
          makeCtx({ path: '/mcp/authorize', query: { ...query, prompt } }),
        ),
      ).resolves.toEqual({
        context: { query: { ...query, prompt: 'consent' } },
      });
    },
  );

  describe('consent submissions', () => {
    it('allows the user the pending authorization belongs to', async () => {
      const ctx = makeCtx({
        path: '/oauth2/consent',
        body: { accept: true, consent_code: 'code_1' },
        verificationValue: pendingValue(),
      });

      await expect(runHook(ctx)).resolves.toBeUndefined();
      expect(
        ctx.context.internalAdapter.findVerificationValue,
      ).toHaveBeenCalledWith('code_1');
    });

    it.each([
      ['a different signed-in user', OTHER_USER, pendingValue()],
      ['an unknown code', OWNER, null],
    ])('refuses %s', async (_label, session, verificationValue) => {
      mockGetSessionFromCtx.mockResolvedValue(session);
      const ctx = makeCtx({
        path: '/oauth2/consent',
        body: { accept: true, consent_code: 'code_1' },
        verificationValue,
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
        body: { error: 'invalid_request', error_description: 'Invalid code' },
      });
    });

    it('checks the code from the signed cookie when the body has none', async () => {
      mockGetSessionFromCtx.mockResolvedValue(OTHER_USER);
      const ctx = makeCtx({
        path: '/oauth2/consent',
        body: { accept: true },
        cookieCode: 'code_from_cookie',
        verificationValue: pendingValue(),
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
      });
      expect(
        ctx.context.internalAdapter.findVerificationValue,
      ).toHaveBeenCalledWith('code_from_cookie');
    });

    it('leaves requests without a code to better-auth', async () => {
      const noCode = makeCtx({
        path: '/oauth2/consent',
        body: { accept: true },
      });
      await expect(runHook(noCode)).resolves.toBeUndefined();
    });

    it('refuses a consent submission without a session cookie', async () => {
      mockGetSessionFromCtx.mockResolvedValue(null);
      const noSession = makeCtx({
        path: '/oauth2/consent',
        body: { accept: true, consent_code: 'code_1' },
      });
      await expect(runHook(noSession)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
      });
      expect(
        noSession.context.internalAdapter.findVerificationValue,
      ).not.toHaveBeenCalled();
    });
  });
});

describe('auth.server.ts MCP OAuth wiring (structural)', () => {
  const authServer = readFileSync(join(__dirname, 'auth.server.ts'), 'utf-8');

  it('runs the hook before every endpoint and configures a consent page', () => {
    expect(authServer).toContain('return mcpOAuthBeforeHook(ctx);');
    expect(authServer).toContain('consentPage: mcpConsentPage,');
  });
});
