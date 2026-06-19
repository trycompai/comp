import { classifyBrowserAutomationError } from './browser-automation-errors';

describe('classifyBrowserAutomationError', () => {
  it('classifies auth expiry as needs_reauth', () => {
    const result = classifyBrowserAutomationError(
      new Error('Session expired. User is not logged in.'),
      'auth',
    );

    expect(result.code).toBe('needs_reauth');
    expect(result.stage).toBe('auth');
    expect(result.needsReauth).toBe(true);
  });

  it('classifies 2FA and device approval as needs_user_action', () => {
    const result = classifyBrowserAutomationError(
      new Error('Device approval required before continuing'),
      'auth',
    );

    expect(result.code).toBe('needs_user_action');
    expect(result.blockedReason).toContain('Manual 2FA');
  });

  it('classifies captcha and rate limit failures with stable codes', () => {
    expect(
      classifyBrowserAutomationError(new Error('reCAPTCHA required')).code,
    ).toBe('captcha_blocked');
    expect(
      classifyBrowserAutomationError(new Error('429 Too Many Requests')).code,
    ).toBe('rate_limited');
  });
});
