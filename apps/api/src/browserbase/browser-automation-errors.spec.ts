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
      new Error(
        'Login paused because device approval required before continuing',
      ),
      'auth',
    );

    expect(result.code).toBe('needs_user_action');
    expect(result.blockedReason).toContain('Manual 2FA');
  });

  it('classifies a refused credential fill as needs_reauth, not unknown', () => {
    // The refusal means no secret was typed because the page is not the
    // connection's own site, so the truthful next step is a reconnect.
    const result = classifyBrowserAutomationError(
      new Error(
        'Refusing to enter saved credentials: the browser is on https://evil.example.net/login but they belong to https://vendor.example.com.',
      ),
      'auth',
    );

    expect(result.code).toBe('needs_reauth');
    expect(result.stage).toBe('auth');
    expect(result.needsReauth).toBe(true);
    expect(result.userFacing).toContain('evil.example.net');
    expect(result.blockedReason).toContain("connection's own site");
  });

  it('classifies captcha and rate limit failures with stable codes', () => {
    expect(
      classifyBrowserAutomationError(new Error('reCAPTCHA required')).code,
    ).toBe('captcha_blocked');
    expect(
      classifyBrowserAutomationError(new Error('429 Too Many Requests')).code,
    ).toBe('rate_limited');
  });

  it('does not expose raw unknown error text to users', () => {
    const result = classifyBrowserAutomationError(
      new Error('internal token abc123'),
    );

    expect(result.code).toBe('unknown');
    expect(result.userFacing).toBe(
      'Browser automation failed for an unknown reason.',
    );
  });

  it('does not classify generic forbidden errors as reauth', () => {
    const result = classifyBrowserAutomationError(
      new Error('403 forbidden while loading report'),
      'navigation',
    );

    expect(result.code).toBe('unknown');
    expect(result.needsReauth).toBe(false);
  });

  it('reads message fields from non-Error thrown objects', () => {
    const result = classifyBrowserAutomationError({
      message: 'Target closed while taking screenshot',
    });

    expect(result.code).toBe('browser_session_lost');
  });
});
