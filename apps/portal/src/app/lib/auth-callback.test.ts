import { describe, expect, it } from 'vitest';
import { buildSignInCallbackUrls } from './auth-callback';

const PORTAL_ORIGIN = 'https://portal.trycomp.ai';
const API_ORIGIN = 'https://api.trycomp.ai';

describe('buildSignInCallbackUrls', () => {
  // CS-760: a new Microsoft/Entra user accepts a portal invite; the OAuth
  // callback errors and better-auth redirects to the errorCallbackURL. If that
  // URL is missing, better-auth defaults to the API baseURL and the user lands
  // on the Swagger docs. The error URL MUST be rooted at the portal, not the API.
  it('returns an errorCallbackURL rooted at the portal, not the API', () => {
    const { errorCallbackURL } = buildSignInCallbackUrls({
      origin: PORTAL_ORIGIN,
      inviteCode: 'invite_test123',
    });

    const url = new URL(errorCallbackURL);
    expect(url.origin).toBe(PORTAL_ORIGIN);
    expect(url.origin).not.toBe(API_ORIGIN);
    expect(url.pathname).toBe('/auth');
  });

  it('sends the success path to the invite page when an invite code is present', () => {
    const { callbackURL, errorCallbackURL } = buildSignInCallbackUrls({
      origin: PORTAL_ORIGIN,
      inviteCode: 'org_abc123',
    });

    expect(callbackURL).toBe(`${PORTAL_ORIGIN}/invite/org_abc123`);
    // Success goes to the invite; error still returns to the portal sign-in.
    expect(errorCallbackURL).toBe(`${PORTAL_ORIGIN}/auth`);
  });

  it('routes device-auth sign-ins to the device callback and preserves params on both URLs', () => {
    const searchParams = new URLSearchParams({
      device_auth: 'true',
      callback_port: '54321',
      state: 'xyz',
    });

    const { callbackURL, errorCallbackURL } = buildSignInCallbackUrls({
      origin: PORTAL_ORIGIN,
      searchParams,
    });

    const success = new URL(callbackURL);
    expect(success.pathname).toBe('/auth/device-callback');
    expect(success.searchParams.get('callback_port')).toBe('54321');
    expect(success.searchParams.get('state')).toBe('xyz');

    const error = new URL(errorCallbackURL);
    expect(error.origin).toBe(PORTAL_ORIGIN);
    expect(error.pathname).toBe('/auth');
    expect(error.searchParams.get('callback_port')).toBe('54321');
  });

  it('defaults the success path to root when there is no invite or device auth', () => {
    const { callbackURL, errorCallbackURL } = buildSignInCallbackUrls({
      origin: PORTAL_ORIGIN,
    });

    expect(callbackURL).toBe(`${PORTAL_ORIGIN}/`);
    expect(errorCallbackURL).toBe(`${PORTAL_ORIGIN}/auth`);
  });
});
