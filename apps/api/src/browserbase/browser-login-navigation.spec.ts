import { looksLikeSignInUrl } from './browser-login-navigation';

describe('looksLikeSignInUrl', () => {
  it('flags sign-in hosts and paths', () => {
    for (const url of [
      'https://signin.aws.amazon.com/console',
      'https://us-east-1.signin.aws.amazon.com/authentication',
      'https://login.microsoftonline.com/common/oauth2/authorize',
      'https://app.acme.com/login',
      'https://app.acme.com/sign-in',
      'https://app.acme.com/auth/callback',
      'https://acme.okta.com/sso/saml',
    ]) {
      expect(looksLikeSignInUrl(url)).toBe(true);
    }
  });

  it('does not flag an authenticated app / console URL', () => {
    for (const url of [
      'https://us-east-1.console.aws.amazon.com/console/home',
      'https://app.acme.com/dashboard',
      'https://github.com/acme/repo',
      'https://app.datadoghq.com/account/settings',
    ]) {
      expect(looksLikeSignInUrl(url)).toBe(false);
    }
  });

  it('handles empty/undefined safely', () => {
    expect(looksLikeSignInUrl(undefined)).toBe(false);
    expect(looksLikeSignInUrl(null)).toBe(false);
    expect(looksLikeSignInUrl('')).toBe(false);
  });
});
