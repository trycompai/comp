import { Logger } from '@nestjs/common';
import { github, google, microsoft } from 'better-auth/social-providers';
import type {
  GithubOptions,
  GoogleOptions,
  MicrosoftOptions,
} from 'better-auth/social-providers';

const logger = new Logger('ProviderSignInPolicy');

/** Social providers whose sign-in must prove the email address. */
export type LinkedProviderId = 'google' | 'github' | 'microsoft';

/**
 * Subset of the profile a provider's `getUserInfo` returns that this policy
 * reads. Kept structural so the wrapper stays assignable to the provider's
 * own `getUserInfo` signature.
 */
export type ProviderUserInfo = {
  user: {
    id: string | number;
    email?: unknown;
    emailVerified?: unknown;
    [key: string]: unknown;
  };
  data: unknown;
};

/**
 * Resolve the email of the User already linked to `(providerId, accountId)`,
 * or `null` when no Account row exists. Injected so this policy — and its
 * spec — never touches Prisma.
 */
export type FindLinkedAccount = (params: {
  providerId: LinkedProviderId;
  providerAccountId: string;
}) => Promise<{ email: string } | null>;

function normalizeEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const trimmed = email.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

/**
 * Wrap a provider's stock `getUserInfo` so a linked Account can only sign in
 * when the provider asserts a verified email AND that email still matches the
 * user the Account is linked to.
 *
 * better-auth's `handleOAuthUserInfo` signs in as the linked Account's user
 * without any email or `emailVerified` check once a
 * `(providerId, accountId)` row exists — the checks it does perform only
 * gate *new* links. This wrapper closes that hole for links that already
 * exist. See ./account-linking-policy.ts for the new-link side.
 */
export function withProvenEmail<TToken, TUserInfo extends ProviderUserInfo>({
  providerId,
  stockGetUserInfo,
  findLinkedAccount,
}: {
  providerId: LinkedProviderId;
  stockGetUserInfo: (token: TToken) => Promise<TUserInfo | null>;
  findLinkedAccount: FindLinkedAccount;
}): (token: TToken) => Promise<TUserInfo | null> {
  return async (token) => {
    const userInfo = await stockGetUserInfo(token);
    if (!userInfo?.user) return null;

    const { user } = userInfo;
    if (user.id === undefined || user.id === null || user.id === '')
      return null;
    if (user.emailVerified !== true) {
      logger.warn(
        `Refused ${providerId} sign-in: the provider did not assert a verified email`,
      );
      return null;
    }

    const providerAccountId = String(user.id);
    const linked = await findLinkedAccount({ providerId, providerAccountId });
    if (!linked) return userInfo;

    const providerEmail = normalizeEmail(user.email);
    const linkedEmail = normalizeEmail(linked.email);
    if (!providerEmail || providerEmail !== linkedEmail) {
      logger.warn(
        `Refused ${providerId} sign-in: the linked account belongs to a different email`,
      );
      return null;
    }

    return userInfo;
  };
}

/**
 * Stock behaviour has to survive the override: better-auth's provider does
 * `if (options.getUserInfo) return options.getUserInfo(token)`, so the
 * override must build its own stock instance from the same options *without*
 * `getUserInfo` and delegate to that.
 */
export function hardenGoogleProviderOptions({
  options,
  findLinkedAccount,
}: {
  options: Omit<GoogleOptions, 'getUserInfo'>;
  findLinkedAccount: FindLinkedAccount;
}): GoogleOptions {
  const stock = google(options);
  return {
    ...options,
    getUserInfo: withProvenEmail({
      providerId: 'google',
      stockGetUserInfo: (token) => stock.getUserInfo(token),
      findLinkedAccount,
    }),
  };
}

export function hardenGithubProviderOptions({
  options,
  findLinkedAccount,
}: {
  options: Omit<GithubOptions, 'getUserInfo'>;
  findLinkedAccount: FindLinkedAccount;
}): GithubOptions {
  const stock = github(options);
  return {
    ...options,
    getUserInfo: withProvenEmail({
      providerId: 'github',
      stockGetUserInfo: (token) => stock.getUserInfo(token),
      findLinkedAccount,
    }),
  };
}

/**
 * `mapProfileToUser` stays on the stock instance: it is where the Microsoft
 * `emailVerified` value comes from (see ./microsoft-email.ts).
 */
export function hardenMicrosoftProviderOptions({
  options,
  findLinkedAccount,
}: {
  options: Omit<MicrosoftOptions, 'getUserInfo'>;
  findLinkedAccount: FindLinkedAccount;
}): MicrosoftOptions {
  const stock = microsoft(options);
  return {
    ...options,
    getUserInfo: withProvenEmail({
      providerId: 'microsoft',
      stockGetUserInfo: (token) => stock.getUserInfo(token),
      findLinkedAccount,
    }),
  };
}
