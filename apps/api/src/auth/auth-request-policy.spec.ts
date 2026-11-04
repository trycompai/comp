const mockGetSessionFromCtx = jest.fn();
const mockVerifyJWT = jest.fn();

jest.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(
      readonly status: string,
      readonly body: Record<string, unknown>,
    ) {
      super(status);
    }
  },
  getSessionFromCtx: (...args: unknown[]) => mockGetSessionFromCtx(...args),
}));

jest.mock('better-auth/crypto', () => ({
  verifyJWT: (...args: unknown[]) => mockVerifyJWT(...args),
}));

import { APIError } from 'better-auth/api';
import {
  assertAuthRequestAllowed,
  assertEmailChangeLinkOwner,
  hasExactRoleNames,
} from './auth-request-policy';

type EmailChangeLinkCtx = Parameters<typeof assertEmailChangeLinkOwner>[0];

function captureError(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return undefined;
}

function verifyEmailCtx(token = 'token_1'): EmailChangeLinkCtx {
  const ctx = {
    path: '/verify-email',
    query: { token },
    context: { secret: 'secret_1' },
  };
  return ctx as unknown as EmailChangeLinkCtx;
}

function sessionFor(email: string) {
  return { user: { id: 'user_1', email }, session: { id: 'session_1' } };
}

describe('assertAuthRequestAllowed', () => {
  it('refuses auth endpoints our clients do not use', () => {
    const error = captureError(() =>
      assertAuthRequestAllowed({
        path: '/email-otp/check-verification-otp',
        body: { email: 'a@example.com', type: 'sign-in', otp: '123456' },
      }),
    );

    expect(error).toBeInstanceOf(APIError);
    expect((error as APIError).status).toBe('FORBIDDEN');
  });

  it('refuses unsupported parameters on social sign-in', () => {
    const error = captureError(() =>
      assertAuthRequestAllowed({
        path: '/sign-in/social',
        body: { provider: 'google', additionalData: { key: 'value' } },
      }),
    );

    expect(error).toBeInstanceOf(APIError);
  });

  it('refuses unsupported parameters on account linking', () => {
    const error = captureError(() =>
      assertAuthRequestAllowed({
        path: '/link-social',
        body: { provider: 'github', additionalData: {} },
      }),
    );

    expect(error).toBeInstanceOf(APIError);
  });

  it('allows social sign-in with supported parameters', () => {
    expect(() =>
      assertAuthRequestAllowed({
        path: '/sign-in/social',
        body: { provider: 'google', callbackURL: 'https://app.trycomp.ai/' },
      }),
    ).not.toThrow();
  });

  it.each([' owner', 'admin, owner', 'admin ', ['admin', ' owner']])(
    'refuses role names that do not match exactly (%p)',
    (role) => {
      const error = captureError(() =>
        assertAuthRequestAllowed({
          path: '/organization/invite-member',
          body: { email: 'a@example.com', role },
        }),
      );

      expect(error).toBeInstanceOf(APIError);
    },
  );

  it.each(['', 'admin,', ',admin', 'admin,,employee'])(
    'refuses role lists with empty entries (%p)',
    (role) => {
      expect(hasExactRoleNames(role)).toBe(false);
    },
  );

  it.each([
    'admin',
    'admin,employee',
    ['auditor', 'employee'],
    'Security Lead',
  ])('allows exact role names, including multiple roles (%p)', (role) => {
    expect(() =>
      assertAuthRequestAllowed({
        path: '/organization/invite-member',
        body: { email: 'a@example.com', role },
      }),
    ).not.toThrow();
  });

  it('ignores other auth endpoints', () => {
    expect(() =>
      assertAuthRequestAllowed({
        path: '/sign-in/magic-link',
        body: { email: 'a@example.com' },
      }),
    ).not.toThrow();
  });
});

describe('assertEmailChangeLinkOwner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires a session to confirm an email change', async () => {
    mockVerifyJWT.mockResolvedValue({
      email: 'old@example.com',
      updateTo: 'new@example.com',
      requestType: 'change-email-verification',
    });
    mockGetSessionFromCtx.mockResolvedValue(null);

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).rejects.toBeInstanceOf(APIError);
  });

  it('refuses confirmation from a different account', async () => {
    mockVerifyJWT.mockResolvedValue({
      email: 'old@example.com',
      updateTo: 'new@example.com',
      requestType: 'change-email-verification',
    });
    mockGetSessionFromCtx.mockResolvedValue(sessionFor('other@example.com'));

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).rejects.toBeInstanceOf(APIError);
  });

  it('confirms the change for the requesting account', async () => {
    mockVerifyJWT.mockResolvedValue({
      email: 'old@example.com',
      updateTo: 'new@example.com',
      requestType: 'change-email-verification',
    });
    mockGetSessionFromCtx.mockResolvedValue(sessionFor('Old@Example.com'));

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).resolves.toBeUndefined();
    expect(mockVerifyJWT).toHaveBeenCalledWith('token_1', 'secret_1');
  });

  it('applies the same rule to change links without a request type', async () => {
    mockVerifyJWT.mockResolvedValue({
      email: 'old@example.com',
      updateTo: 'new@example.com',
    });
    mockGetSessionFromCtx.mockResolvedValue(null);

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).rejects.toBeInstanceOf(APIError);
  });

  it('allows the first confirmation step sent to the current address', async () => {
    mockVerifyJWT.mockResolvedValue({
      email: 'old@example.com',
      updateTo: 'new@example.com',
      requestType: 'change-email-confirmation',
    });

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).resolves.toBeUndefined();
    expect(mockGetSessionFromCtx).not.toHaveBeenCalled();
  });

  it('leaves standard email verification unchanged', async () => {
    mockVerifyJWT.mockResolvedValue({ email: 'user@example.com' });

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx()),
    ).resolves.toBeUndefined();
    expect(mockGetSessionFromCtx).not.toHaveBeenCalled();
  });

  it('leaves invalid tokens to the endpoint', async () => {
    mockVerifyJWT.mockResolvedValue(null);

    await expect(
      assertEmailChangeLinkOwner(verifyEmailCtx('bad')),
    ).resolves.toBeUndefined();
  });

  it('ignores other paths', async () => {
    const ctx = {
      ...verifyEmailCtx(),
      path: '/get-session',
    } as unknown as EmailChangeLinkCtx;

    await expect(assertEmailChangeLinkOwner(ctx)).resolves.toBeUndefined();
    expect(mockVerifyJWT).not.toHaveBeenCalled();
  });
});
