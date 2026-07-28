import { normalizeTotpSecret } from './browser-totp-secret';

describe('normalizeTotpSecret', () => {
  it('compacts and upper-cases a formatted Base32 seed', () => {
    expect(normalizeTotpSecret('  jbsw y3dp ehpk 3pxp  ')).toBe(
      'JBSWY3DPEHPK3PXP',
    );
    expect(normalizeTotpSecret('JBSW-Y3DP-EHPK-3PXP')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('keeps an otpauth:// URI verbatim', () => {
    const uri = 'otpauth://totp/Acme:alice?secret=JBSWY3DPEHPK3PXP&issuer=Acme';
    expect(normalizeTotpSecret(uri)).toBe(uri);
  });

  it('rejects a rotating one-time code', () => {
    expect(normalizeTotpSecret('123456')).toBeNull();
    expect(normalizeTotpSecret('12 34 56')).toBeNull();
    expect(normalizeTotpSecret('12345678')).toBeNull();
  });

  it('rejects a too-short key', () => {
    expect(normalizeTotpSecret('JBSWY3DP')).toBeNull();
  });

  it('rejects non-Base32 characters (0/1/8/9 and symbols are not in the alphabet)', () => {
    expect(normalizeTotpSecret('JBSWY3DPEHPK3PX!')).toBeNull();
    expect(normalizeTotpSecret('JBSWY3DPEHPK3PX0')).toBeNull();
  });

  it('strips trailing Base32 padding when validating length', () => {
    // 16 significant chars + padding is still a valid seed; padding is preserved.
    expect(normalizeTotpSecret('JBSWY3DPEHPK3PXP===')).toBe('JBSWY3DPEHPK3PXP===');
    // Padding must not count toward the minimum length.
    expect(normalizeTotpSecret('JBSWY3DP========')).toBeNull();
  });

  it('rejects empty / missing input', () => {
    expect(normalizeTotpSecret('')).toBeNull();
    expect(normalizeTotpSecret('   ')).toBeNull();
    expect(normalizeTotpSecret(undefined)).toBeNull();
    expect(normalizeTotpSecret(null)).toBeNull();
  });

  it('rejects an absurdly long input without heavy backtracking', () => {
    // A pathological ReDoS-style input for a `=+$` pattern — must fail fast on
    // the length bound, not churn.
    const evil = '='.repeat(50000) + 'A';
    const start = Date.now();
    expect(normalizeTotpSecret(evil)).toBeNull();
    // Generous bound (real work here is sub-millisecond) — a regression to
    // catastrophic backtracking would take seconds.
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
