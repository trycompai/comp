// better-auth is ESM-only and jest here runs CommonJS, so the provider
// factories are stubbed by a stock-shaped fake: each returns a `getUserInfo`
// that decodes the id token and applies `mapProfileToUser`, mirroring
// `@better-auth/core`'s google/github/microsoft providers — but, like the real
// stock instance built without `getUserInfo`, it never calls back into the
// override.
jest.mock('better-auth/social-providers', () => {
  const decodeIdToken = (idToken?: string) => {
    if (!idToken) return null;
    const [, payload] = idToken.split('.');
    try {
      return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
  };

  const stockProvider = (id: string) => (options: Record<string, unknown>) => ({
    id,
    name: id,
    options,
    getUserInfo: async (token: { idToken?: string }) => {
      const claims = decodeIdToken(token.idToken);
      if (!claims) return null;
      const { mapProfileToUser } = options;
      const mapped =
        typeof mapProfileToUser === 'function'
          ? await mapProfileToUser(claims)
          : {};
      return {
        user: {
          id: claims.sub,
          email: claims.email,
          emailVerified: claims.email_verified,
          ...mapped,
        },
        data: claims,
      };
    },
  });

  return {
    google: stockProvider('google'),
    github: stockProvider('github'),
    microsoft: stockProvider('microsoft'),
  };
});

import {
  hardenGithubProviderOptions,
  hardenGoogleProviderOptions,
  hardenMicrosoftProviderOptions,
  withProvenEmail,
} from './provider-sign-in-policy';
import { mapMicrosoftProfileToUser } from './microsoft-email';

interface StockUserInfo {
  user: { id: string; email?: string | null; emailVerified: boolean };
  data: unknown;
}

function stockResult({
  email,
  emailVerified,
  id = 'provider-user-1',
}: {
  email: string | null;
  emailVerified: boolean;
  id?: string;
}): StockUserInfo {
  return { user: { id, email, emailVerified }, data: { raw: true } };
}

function buildPolicy({
  result,
  linkedEmail = null,
}: {
  result: StockUserInfo | null;
  linkedEmail?: string | null;
}) {
  const findLinkedAccount = jest.fn(() =>
    Promise.resolve(linkedEmail === null ? null : { email: linkedEmail }),
  );
  const stockGetUserInfo = jest.fn(() => Promise.resolve(result));
  const getUserInfo = withProvenEmail({
    providerId: 'google',
    stockGetUserInfo,
    findLinkedAccount,
  });
  return { getUserInfo, stockGetUserInfo, findLinkedAccount };
}

function fakeIdToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.signature`;
}

describe('withProvenEmail', () => {
  it('returns null when the provider could not describe the user', async () => {
    const { getUserInfo, findLinkedAccount } = buildPolicy({ result: null });

    await expect(getUserInfo({})).resolves.toBeNull();
    expect(findLinkedAccount).not.toHaveBeenCalled();
  });

  it('refuses an unverified provider email', async () => {
    const { getUserInfo, findLinkedAccount } = buildPolicy({
      result: stockResult({ email: 'owner@trycomp.ai', emailVerified: false }),
      linkedEmail: 'owner@trycomp.ai',
    });

    await expect(getUserInfo({})).resolves.toBeNull();
    expect(findLinkedAccount).not.toHaveBeenCalled();
  });

  it('passes a verified, not-yet-linked identity straight through', async () => {
    const result = stockResult({
      email: 'owner@trycomp.ai',
      emailVerified: true,
    });
    const { getUserInfo, findLinkedAccount } = buildPolicy({ result });

    await expect(getUserInfo({})).resolves.toBe(result);
    expect(findLinkedAccount).toHaveBeenCalledWith({
      providerId: 'google',
      providerAccountId: 'provider-user-1',
    });
  });

  it('passes when the linked account has the same email in another case', async () => {
    const result = stockResult({
      email: 'Owner@TryComp.ai',
      emailVerified: true,
    });
    const { getUserInfo } = buildPolicy({
      result,
      linkedEmail: 'owner@trycomp.ai',
    });

    await expect(getUserInfo({})).resolves.toBe(result);
  });

  it('refuses when the linked account belongs to a different email', async () => {
    const { getUserInfo } = buildPolicy({
      result: stockResult({
        email: 'attacker@example.com',
        emailVerified: true,
      }),
      linkedEmail: 'owner@trycomp.ai',
    });

    await expect(getUserInfo({})).resolves.toBeNull();
  });

  it('refuses a linked account when the provider sent no email', async () => {
    const { getUserInfo } = buildPolicy({
      result: stockResult({ email: null, emailVerified: true }),
      linkedEmail: 'owner@trycomp.ai',
    });

    await expect(getUserInfo({})).resolves.toBeNull();
  });
});

describe('provider wiring', () => {
  it('installs the policy on Google while delegating to stock behaviour', async () => {
    const findLinkedAccount = jest.fn(() => Promise.resolve(null));
    const options = hardenGoogleProviderOptions({
      options: { clientId: 'client-id', clientSecret: 'client-secret' },
      findLinkedAccount,
    });

    expect(options.clientId).toBe('client-id');
    expect(options.clientSecret).toBe('client-secret');

    const userInfo = await options.getUserInfo?.({
      idToken: fakeIdToken({
        sub: 'google-user-1',
        email: 'owner@trycomp.ai',
        email_verified: true,
      }),
    });

    expect(userInfo?.user).toMatchObject({
      id: 'google-user-1',
      email: 'owner@trycomp.ai',
      emailVerified: true,
    });
    expect(findLinkedAccount).toHaveBeenCalledWith({
      providerId: 'google',
      providerAccountId: 'google-user-1',
    });
  });

  it('refuses an unverified Google identity through the stock path', async () => {
    const options = hardenGoogleProviderOptions({
      options: { clientId: 'client-id', clientSecret: 'client-secret' },
      findLinkedAccount: () => Promise.resolve(null),
    });

    await expect(
      options.getUserInfo?.({
        idToken: fakeIdToken({
          sub: 'google-user-1',
          email: 'owner@trycomp.ai',
          email_verified: false,
        }),
      }),
    ).resolves.toBeNull();
  });

  it('keeps GitHub client credentials', () => {
    const options = hardenGithubProviderOptions({
      options: { clientId: 'client-id', clientSecret: 'client-secret' },
      findLinkedAccount: () => Promise.resolve(null),
    });

    expect(options.clientId).toBe('client-id');
    expect(typeof options.getUserInfo).toBe('function');
  });

  it('keeps Microsoft mapProfileToUser on the stock instance', async () => {
    const options = hardenMicrosoftProviderOptions({
      options: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tenantId: 'common',
        prompt: 'select_account',
        mapProfileToUser: mapMicrosoftProfileToUser,
      },
      findLinkedAccount: () => Promise.resolve(null),
    });

    expect(options.mapProfileToUser).toBe(mapMicrosoftProfileToUser);
    expect(options.tenantId).toBe('common');

    // The stock instance must apply mapProfileToUser: Entra work accounts only
    // carry `preferred_username`, and that is what the verified check reads.
    const userInfo = await options.getUserInfo?.({
      idToken: fakeIdToken({
        sub: 'microsoft-user-1',
        preferred_username: 'owner@trycomp.ai',
        verified_primary_email: ['owner@trycomp.ai'],
      }),
    });

    expect(userInfo?.user).toMatchObject({
      email: 'owner@trycomp.ai',
      emailVerified: true,
    });
  });
});
