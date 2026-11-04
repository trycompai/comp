import { APIError, getSessionFromCtx } from 'better-auth/api';
import { verifyJWT } from 'better-auth/crypto';

type AuthEndpointContext = Parameters<typeof getSessionFromCtx>[0];

// Auth endpoints our clients don't use.
const DISABLED_PATHS: ReadonlySet<string> = new Set([
  '/email-otp/check-verification-otp',
]);

// OAuth requests accept only the parameters our clients send.
const OAUTH_START_PATHS: ReadonlySet<string> = new Set([
  '/sign-in/social',
  '/link-social',
]);

const INVITE_MEMBER_PATH = '/organization/invite-member';
const VERIFY_EMAIL_PATH = '/verify-email';
const EMAIL_CHANGE_CONFIRMATION = 'change-email-confirmation';

interface EmailChangeTokenPayload {
  email?: unknown;
  updateTo?: unknown;
  requestType?: unknown;
}

function readField({ source, key }: { source: unknown; key: string }): unknown {
  if (typeof source !== 'object' || source === null) return undefined;
  return Reflect.get(source, key);
}

function forbidden(): APIError {
  return new APIError('FORBIDDEN', { message: 'Forbidden' });
}

// Role assignments must match a defined role name exactly.
export function hasExactRoleNames(role: unknown): boolean {
  if (role === undefined) return true;
  const entries = Array.isArray(role) ? role : [role];
  return entries.every(
    (entry) =>
      typeof entry === 'string' &&
      entry.split(',').every((name) => name.length > 0 && name === name.trim()),
  );
}

export function assertAuthRequestAllowed({
  path,
  body,
}: {
  path: string;
  body: unknown;
}): void {
  if (DISABLED_PATHS.has(path)) throw forbidden();

  if (
    OAUTH_START_PATHS.has(path) &&
    readField({ source: body, key: 'additionalData' }) !== undefined
  ) {
    throw forbidden();
  }

  if (
    path === INVITE_MEMBER_PATH &&
    !hasExactRoleNames(readField({ source: body, key: 'role' }))
  ) {
    throw forbidden();
  }
}

// Email-change confirmation is bound to the requesting account's session.
export async function assertEmailChangeLinkOwner(
  ctx: AuthEndpointContext,
): Promise<void> {
  if (ctx.path !== VERIFY_EMAIL_PATH) return;

  const token = readField({ source: ctx.query, key: 'token' });
  if (typeof token !== 'string') return;

  const payload = await verifyJWT<EmailChangeTokenPayload>(
    token,
    ctx.context.secret,
  );
  if (!payload || typeof payload.updateTo !== 'string') return;
  if (payload.requestType === EMAIL_CHANGE_CONFIRMATION) return;

  const session = await getSessionFromCtx(ctx);
  const sessionEmail = session?.user.email.toLowerCase();
  if (sessionEmail && sessionEmail === payload.email) return;

  throw new APIError('UNAUTHORIZED', {
    message: 'Sign in to the account that requested this change to confirm it',
  });
}
