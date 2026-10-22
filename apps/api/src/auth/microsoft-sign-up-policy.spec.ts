jest.mock('better-auth/api', () => ({
  APIError: class APIError extends Error {
    constructor(
      readonly status: string,
      readonly body: Record<string, unknown>,
    ) {
      super(typeof body?.message === 'string' ? body.message : status);
    }
  },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';
import { APIError } from 'better-auth/api';
import {
  assertMicrosoftSignUpVerified,
  isMicrosoftSignInContext,
} from './microsoft-sign-up-policy';

const microsoftCallback = { params: { id: 'microsoft' } };
const microsoftIdTokenSignIn = {
  body: { provider: 'microsoft', idToken: { token: 'x' } },
};

describe('isMicrosoftSignInContext', () => {
  it('recognizes the Microsoft callback and ID token sign-in', () => {
    expect(isMicrosoftSignInContext(microsoftCallback)).toBe(true);
    expect(isMicrosoftSignInContext(microsoftIdTokenSignIn)).toBe(true);
  });

  it('ignores other providers and malformed contexts', () => {
    expect(isMicrosoftSignInContext({ params: { id: 'google' } })).toBe(false);
    expect(isMicrosoftSignInContext({ body: { provider: 'github' } })).toBe(
      false,
    );
    expect(isMicrosoftSignInContext(null)).toBe(false);
    expect(isMicrosoftSignInContext({ params: 'microsoft', body: 42 })).toBe(
      false,
    );
  });
});

describe('assertMicrosoftSignUpVerified', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['callback', microsoftCallback],
    ['ID token sign-in', microsoftIdTokenSignIn],
  ])(
    'refuses an unverified Microsoft sign-up via the %s',
    (_label, context) => {
      for (const emailVerified of [false, undefined, 'true', 1]) {
        expect(() =>
          assertMicrosoftSignUpVerified({ user: { emailVerified }, context }),
        ).toThrow(
          new APIError('UNAUTHORIZED', { message: 'account not linked' }),
        );
      }
    },
  );

  it('allows a verified Microsoft sign-up', () => {
    expect(() =>
      assertMicrosoftSignUpVerified({
        user: { emailVerified: true },
        context: microsoftCallback,
      }),
    ).not.toThrow();
  });

  it('leaves other sign-ups alone', () => {
    expect(() =>
      assertMicrosoftSignUpVerified({
        user: { emailVerified: false },
        context: { params: { id: 'github' } },
      }),
    ).not.toThrow();
    expect(() =>
      assertMicrosoftSignUpVerified({
        user: { emailVerified: false },
        context: null,
      }),
    ).not.toThrow();
  });
});

describe('auth.server.ts wiring (structural)', () => {
  const authServer = readFileSync(join(__dirname, 'auth.server.ts'), 'utf-8');

  it('uses the Microsoft profile mapping and sign-up check', () => {
    expect(authServer).toContain('mapProfileToUser: mapMicrosoftProfileToUser');
    expect(authServer).toContain(
      'assertMicrosoftSignUpVerified({ user, context })',
    );
  });

  it('only trusts Google and GitHub for account linking', () => {
    expect(authServer).toContain("trustedProviders: ['google', 'github'],");
  });
});
