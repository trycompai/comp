import {
  isMicrosoftEmailVerified,
  mapMicrosoftProfileToUser,
  resolveMicrosoftEmail,
} from './microsoft-email';

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
      resolveMicrosoftEmail({
        email: '   ',
        preferred_username: 'login@corp.com',
      }),
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
      resolveMicrosoftEmail({
        preferred_username: 'pref@corp.com',
        upn: 'upn@corp.com',
      }),
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

describe('isMicrosoftEmailVerified', () => {
  it('accepts the email claim when xms_edov is true', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: { email: 'Admin@Corp.com', xms_edov: true },
        email: 'admin@corp.com',
      }),
    ).toBe(true);
  });

  it('accepts the email claim when email_verified is true', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: { email: 'admin@corp.com', email_verified: true },
        email: 'admin@corp.com',
      }),
    ).toBe(true);
  });

  it('rejects an email claim with no verification claim', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: { email: 'admin@corp.com' },
        email: 'admin@corp.com',
      }),
    ).toBe(false);
  });

  it('rejects verification flags that are not exactly true', () => {
    for (const flag of [false, 'true', 1]) {
      expect(
        isMicrosoftEmailVerified({
          profile: {
            email: 'admin@corp.com',
            xms_edov: flag,
            email_verified: flag,
          },
          email: 'admin@corp.com',
        }),
      ).toBe(false);
    }
  });

  it('rejects an address that came from preferred_username or upn', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: {
          preferred_username: 'admin@corp.com',
          upn: 'admin@corp.com',
          xms_edov: true,
          email_verified: true,
        },
        email: 'admin@corp.com',
      }),
    ).toBe(false);
  });

  it('rejects when the verified email claim is a different address', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: { email: 'other@example.com', xms_edov: true },
        email: 'admin@corp.com',
      }),
    ).toBe(false);
  });

  it('accepts an address listed in verified_primary_email or verified_secondary_email', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: {
          preferred_username: 'admin@corp.com',
          verified_primary_email: ['ADMIN@corp.com'],
        },
        email: 'admin@corp.com',
      }),
    ).toBe(true);
    expect(
      isMicrosoftEmailVerified({
        profile: {
          email: 'admin@corp.com',
          verified_secondary_email: ['other@corp.com', 'admin@corp.com'],
        },
        email: 'admin@corp.com',
      }),
    ).toBe(true);
    expect(
      isMicrosoftEmailVerified({
        profile: {
          email: 'admin@corp.com',
          verified_primary_email: 'admin@corp.com',
        },
        email: 'admin@corp.com',
      }),
    ).toBe(true);
  });

  it('matches list entries exactly, not as substrings', () => {
    for (const listed of ['xadmin@corp.com', ['admin@corp.com.example']]) {
      expect(
        isMicrosoftEmailVerified({
          profile: { email: 'admin@corp.com', verified_primary_email: listed },
          email: 'admin@corp.com',
        }),
      ).toBe(false);
    }
  });

  it('ignores non-string list entries', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: {
          email: 'admin@corp.com',
          verified_primary_email: [null, 42, { email: 'admin@corp.com' }],
        },
        email: 'admin@corp.com',
      }),
    ).toBe(false);
  });

  it('is false when there is no address', () => {
    expect(
      isMicrosoftEmailVerified({
        profile: { xms_edov: true },
        email: undefined,
      }),
    ).toBe(false);
  });
});

describe('mapMicrosoftProfileToUser', () => {
  it('returns the resolved email with its verification status', () => {
    expect(
      mapMicrosoftProfileToUser({ email: 'admin@corp.com', xms_edov: true }),
    ).toEqual({ email: 'admin@corp.com', emailVerified: true });
    expect(
      mapMicrosoftProfileToUser({ preferred_username: 'login@corp.com' }),
    ).toEqual({ email: 'login@corp.com', emailVerified: false });
  });

  it('always sets emailVerified', () => {
    expect(mapMicrosoftProfileToUser({})).toEqual({
      email: undefined,
      emailVerified: false,
    });
  });
});
