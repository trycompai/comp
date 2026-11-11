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
  getSessionFromCtx: jest.fn(),
}));

import { mcpOAuthBeforeHook } from './mcp-oauth-hooks';

const runHook = mcpOAuthBeforeHook as unknown as (
  ctx: unknown,
) => Promise<unknown>;

const CONSENT_QUERY = {
  model: 'oauthConsent',
  where: [
    { field: 'clientId', value: 'client_1' },
    { field: 'userId', value: 'user_1' },
    { field: 'consentGiven', value: true },
  ],
};

function pendingValue({ requireConsent }: { requireConsent: boolean }) {
  return JSON.stringify({
    clientId: 'client_1',
    redirectURI: 'https://client.example.com/callback',
    scope: ['openid'],
    userId: 'user_1',
    requireConsent,
  });
}

function makeTokenCtx({
  body,
  verificationValue = null,
  consentRow = null,
  tokenRow = null,
}: {
  body: unknown;
  verificationValue?: string | null;
  consentRow?: { id: string } | null;
  tokenRow?: { clientId: string; userId: string } | null;
}) {
  return {
    path: '/mcp/token',
    body,
    context: {
      internalAdapter: {
        findVerificationValue: jest
          .fn()
          .mockResolvedValue(
            verificationValue ? { value: verificationValue } : null,
          ),
      },
      adapter: {
        findOne: jest.fn(({ model }: { model: string }) =>
          Promise.resolve(model === 'oauthAccessToken' ? tokenRow : consentRow),
        ),
      },
    },
  };
}

describe('mcpOAuthBeforeHook token requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('code exchange', () => {
    const tokenBody = {
      grant_type: 'authorization_code',
      code: 'code_1',
      client_id: 'client_1',
      redirect_uri: 'https://client.example.com/callback',
      code_verifier: 'verifier',
    };

    it('allows a code the user approved', async () => {
      const ctx = makeTokenCtx({
        body: tokenBody,
        verificationValue: pendingValue({ requireConsent: false }),
        consentRow: { id: 'consent_1' },
      });

      await expect(runHook(ctx)).resolves.toBeUndefined();
      expect(ctx.context.adapter.findOne).toHaveBeenCalledWith(CONSENT_QUERY);
    });

    it.each([
      [
        'an incomplete authorization',
        pendingValue({ requireConsent: true }),
        { id: 'consent_1' },
      ],
      [
        'a code with no recorded approval',
        pendingValue({ requireConsent: false }),
        null,
      ],
      ['an unknown code', null, null],
      ['a value that is not an authorization', '{"email":"a@b.c"}', null],
    ])('refuses %s', async (_label, verificationValue, consentRow) => {
      const ctx = makeTokenCtx({
        body: tokenBody,
        verificationValue,
        consentRow,
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
        body: { error: 'invalid_grant', error_description: 'invalid code' },
      });
    });

    it('refuses a code that is not a string', async () => {
      const ctx = makeTokenCtx({
        body: { ...tokenBody, code: ['code_1'] },
        verificationValue: pendingValue({ requireConsent: false }),
        consentRow: { id: 'consent_1' },
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
      });
      expect(
        ctx.context.internalAdapter.findVerificationValue,
      ).not.toHaveBeenCalled();
    });
  });

  describe('refresh token exchange', () => {
    const refreshBody = {
      grant_type: 'refresh_token',
      refresh_token: 'refresh_1',
      client_id: 'client_1',
      code: 'code_1',
    };
    const tokenRow = { clientId: 'client_1', userId: 'user_1' };

    it('allows a refresh token for a grant the user approved', async () => {
      const ctx = makeTokenCtx({
        body: refreshBody,
        tokenRow,
        consentRow: { id: 'consent_1' },
      });

      await expect(runHook(ctx)).resolves.toBeUndefined();
      expect(ctx.context.adapter.findOne).toHaveBeenNthCalledWith(1, {
        model: 'oauthAccessToken',
        where: [{ field: 'refreshToken', value: 'refresh_1' }],
      });
      expect(ctx.context.adapter.findOne).toHaveBeenNthCalledWith(
        2,
        CONSENT_QUERY,
      );
      expect(
        ctx.context.internalAdapter.findVerificationValue,
      ).not.toHaveBeenCalled();
    });

    it.each([
      ['a refresh token with no recorded approval', tokenRow],
      ['an unknown refresh token', null],
    ])('refuses %s', async (_label, row) => {
      const ctx = makeTokenCtx({ body: refreshBody, tokenRow: row });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
        body: {
          error: 'invalid_grant',
          error_description: 'invalid refresh token',
        },
      });
    });

    it('refuses a refresh token that is not a string', async () => {
      const ctx = makeTokenCtx({
        body: { ...refreshBody, refresh_token: ['refresh_1'] },
        tokenRow,
        consentRow: { id: 'consent_1' },
      });

      await expect(runHook(ctx)).rejects.toMatchObject({
        status: 'UNAUTHORIZED',
      });
      expect(ctx.context.adapter.findOne).not.toHaveBeenCalled();
    });
  });

  it.each([
    { grant_type: 'authorization_code' },
    { grant_type: 'refresh_token' },
  ])(
    'leaves requests without a credential to better-auth (%p)',
    async (body) => {
      const ctx = makeTokenCtx({ body });

      await expect(runHook(ctx)).resolves.toBeUndefined();
      expect(
        ctx.context.internalAdapter.findVerificationValue,
      ).not.toHaveBeenCalled();
      expect(ctx.context.adapter.findOne).not.toHaveBeenCalled();
    },
  );
});
