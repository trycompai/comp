import { APIError, getSessionFromCtx } from 'better-auth/api';
import {
  parsePendingAuthorization,
  type PendingAuthorization,
} from './oauth-pending-authorization';

type AuthEndpointContext = Parameters<typeof getSessionFromCtx>[0];

interface Grant {
  clientId: string;
  userId: string;
}

const MCP_REGISTER_PATH = '/mcp/register';
const MCP_AUTHORIZE_PATH = '/mcp/authorize';
const MCP_TOKEN_PATH = '/mcp/token';
const OAUTH_CONSENT_PATH = '/oauth2/consent';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function findPendingAuthorization({
  ctx,
  code,
}: {
  ctx: AuthEndpointContext;
  code: string;
}): Promise<PendingAuthorization | null> {
  const record = await ctx.context.internalAdapter.findVerificationValue(code);
  return record ? parsePendingAuthorization(record.value) : null;
}

async function hasRecordedConsent({
  ctx,
  grant,
}: {
  ctx: AuthEndpointContext;
  grant: Grant;
}): Promise<boolean> {
  const consent = await ctx.context.adapter.findOne<{ id: string }>({
    model: 'oauthConsent',
    where: [
      { field: 'clientId', value: grant.clientId },
      { field: 'userId', value: grant.userId },
      { field: 'consentGiven', value: true },
    ],
  });
  return consent !== null;
}

async function assertConsentOwner(ctx: AuthEndpointContext): Promise<void> {
  const bodyCode = isRecord(ctx.body) ? ctx.body.consent_code : undefined;
  const code =
    (typeof bodyCode === 'string' && bodyCode) ||
    (await ctx.getSignedCookie('oidc_consent_prompt', ctx.context.secret));
  if (!code) return;

  const session = await getSessionFromCtx(ctx);
  const pending = session
    ? await findPendingAuthorization({ ctx, code })
    : null;
  if (session && pending?.userId === session.user.id) return;

  console.warn('[Auth] OAuth consent submission refused', {
    userId: session?.user.id ?? null,
  });
  throw new APIError('UNAUTHORIZED', {
    error_description: 'Invalid code',
    error: 'invalid_request',
  });
}

async function findCodeGrant({
  ctx,
  code,
}: {
  ctx: AuthEndpointContext;
  code: unknown;
}): Promise<Grant | null> {
  if (typeof code !== 'string') return null;
  const pending = await findPendingAuthorization({ ctx, code });
  return pending && !pending.requireConsent ? pending : null;
}

async function findRefreshGrant({
  ctx,
  refreshToken,
}: {
  ctx: AuthEndpointContext;
  refreshToken: unknown;
}): Promise<Grant | null> {
  if (typeof refreshToken !== 'string') return null;
  return ctx.context.adapter.findOne<Grant>({
    model: 'oauthAccessToken',
    where: [{ field: 'refreshToken', value: refreshToken }],
  });
}

async function assertGrantApproved(ctx: AuthEndpointContext): Promise<void> {
  const body = isRecord(ctx.body) ? ctx.body : {};
  const isRefresh = body.grant_type === 'refresh_token';
  const credential = isRefresh ? body.refresh_token : body.code;
  if (!credential) return;

  const grant = isRefresh
    ? await findRefreshGrant({ ctx, refreshToken: credential })
    : await findCodeGrant({ ctx, code: credential });
  if (grant && (await hasRecordedConsent({ ctx, grant }))) return;

  console.warn('[Auth] OAuth token request refused', {
    grantType: isRefresh ? 'refresh_token' : 'authorization_code',
    clientId: grant?.clientId ?? null,
  });
  throw new APIError('UNAUTHORIZED', {
    error_description: isRefresh ? 'invalid refresh token' : 'invalid code',
    error: 'invalid_grant',
  });
}

export async function mcpOAuthBeforeHook(ctx: AuthEndpointContext) {
  if (ctx.path === MCP_REGISTER_PATH) {
    throw new APIError('FORBIDDEN', { error: 'access_denied' });
  }

  if (ctx.path === MCP_AUTHORIZE_PATH) {
    return { context: { query: { ...ctx.query, prompt: 'consent' } } };
  }

  if (ctx.path === OAUTH_CONSENT_PATH) {
    await assertConsentOwner(ctx);
  }

  if (ctx.path === MCP_TOKEN_PATH) {
    await assertGrantApproved(ctx);
  }
}
