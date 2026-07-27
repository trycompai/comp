import { resolveMicrosoftEmail } from './microsoft-email';

describe('resolveMicrosoftEmail', () => {
  it('returns the email claim unchanged when present (no regression for working accounts)', () => {
    expect(
      resolveMicrosoftEmail({
        email: 'real@corp.com',
        preferred_username: 'login@corp.onmicrosoft.com',
        upn: 'upn@corp.com',
      }),
    ).toBe('real@corp.com');
  });

  it('falls back to preferred_username when the email claim is missing', () => {
    expect(
      resolveMicrosoftEmail({
        preferred_username: 'login@corp.com',
        upn: 'upn@corp.com',
      }),
    ).toBe('login@corp.com');
  });

  it('falls back to upn when email and preferred_username are missing', () => {
    expect(resolveMicrosoftEmail({ upn: 'upn@corp.com' })).toBe('upn@corp.com');
  });

  it('returns undefined when no identifier is present (still fails loudly)', () => {
    expect(resolveMicrosoftEmail({})).toBeUndefined();
  });

  it('treats empty / whitespace-only claims as missing and falls back', () => {
    expect(
      resolveMicrosoftEmail({ email: '   ', preferred_username: 'login@corp.com' }),
    ).toBe('login@corp.com');
  });

  it('handles null claims (Entra may send null) and falls back', () => {
    expect(
      resolveMicrosoftEmail({
        email: null,
        preferred_username: null,
        upn: 'upn@corp.com',
      }),
    ).toBe('upn@corp.com');
  });

  it('trims surrounding whitespace from the chosen value', () => {
    expect(resolveMicrosoftEmail({ email: '  real@corp.com  ' })).toBe(
      'real@corp.com',
    );
  });

  it('returns undefined when every claim is empty/whitespace', () => {
    expect(
      resolveMicrosoftEmail({ email: '', preferred_username: '  ', upn: '' }),
    ).toBeUndefined();
  });

  it('prefers preferred_username over upn when both are present (and email absent)', () => {
    expect(
      resolveMicrosoftEmail({ preferred_username: 'pref@corp.com', upn: 'upn@corp.com' }),
    ).toBe('pref@corp.com');
  });

  it('does not crash on a non-string claim (untrusted JWT) and falls back', () => {
    // The decoded ID token is attacker-influenced; a non-string claim must not
    // throw (e.g. .trim() on a number). Cast through unknown to simulate it.
    const malformed = {
      email: 12345,
      preferred_username: { spoofed: true },
      upn: 'upn@corp.com',
    } as unknown as Parameters<typeof resolveMicrosoftEmail>[0];
    expect(resolveMicrosoftEmail(malformed)).toBe('upn@corp.com');
  });

  it('returns undefined when all claims are present but none are usable strings', () => {
    const malformed = {
      email: 0,
      preferred_username: null,
      upn: false,
    } as unknown as Parameters<typeof resolveMicrosoftEmail>[0];
    expect(resolveMicrosoftEmail(malformed)).toBeUndefined();
  });
});
