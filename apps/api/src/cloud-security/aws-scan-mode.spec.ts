import {
  AWS_SCAN_MODES,
  DEFAULT_AWS_SCAN_MODE,
  isSecurityHubMode,
  resolveAwsScanMode,
} from './aws-scan-mode';

describe('aws-scan-mode', () => {
  describe('resolveAwsScanMode', () => {
    it('returns "security_hub" when the value is exactly that string', () => {
      expect(resolveAwsScanMode('security_hub')).toBe('security_hub');
    });

    it('returns the default for "comp_scanners"', () => {
      expect(resolveAwsScanMode('comp_scanners')).toBe('comp_scanners');
    });

    it('returns the default for unknown strings', () => {
      // Defensive — typos / future modes / corrupted JSON variables must
      // never accidentally activate Security Hub mode.
      expect(resolveAwsScanMode('SECURITY_HUB')).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode('securityhub')).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode('xyz')).toBe(DEFAULT_AWS_SCAN_MODE);
    });

    it('returns the default for missing / non-string values', () => {
      expect(resolveAwsScanMode(undefined)).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode(null)).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode(0)).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode({})).toBe(DEFAULT_AWS_SCAN_MODE);
      expect(resolveAwsScanMode([])).toBe(DEFAULT_AWS_SCAN_MODE);
    });
  });

  describe('isSecurityHubMode', () => {
    it('is true only for the exact "security_hub" string', () => {
      expect(isSecurityHubMode('security_hub')).toBe(true);
      expect(isSecurityHubMode('comp_scanners')).toBe(false);
      expect(isSecurityHubMode(undefined)).toBe(false);
      expect(isSecurityHubMode('SECURITY_HUB')).toBe(false);
    });
  });

  describe('DEFAULT_AWS_SCAN_MODE', () => {
    it('is "comp_scanners" — today\'s behavior is the safe default', () => {
      // This is intentionally guarded by a test: changing the default
      // would silently shift production behavior for every existing
      // connection that does not have an explicit scan mode set.
      expect(DEFAULT_AWS_SCAN_MODE).toBe('comp_scanners');
    });
  });

  describe('AWS_SCAN_MODES', () => {
    it('lists exactly the two known modes (source of truth for DTOs / validators)', () => {
      // If a new mode is added, this test must change in lockstep with
      // the AwsScanMode union — the DTO `@IsIn(AWS_SCAN_MODES)` will
      // automatically pick up the new value, but reviewers should see
      // this test fail as a sanity check that the list was updated.
      expect([...AWS_SCAN_MODES]).toEqual(['comp_scanners', 'security_hub']);
    });

    it('contains the default mode', () => {
      // Guards against future refactors that might remove the default
      // from the list — would break validation for every existing
      // connection that lacks an explicit mode.
      expect([...AWS_SCAN_MODES]).toContain(DEFAULT_AWS_SCAN_MODE);
    });

    it('every entry passes resolveAwsScanMode round-trip (self-consistency)', () => {
      // Catches drift if someone adds a mode to the array without
      // updating resolveAwsScanMode.
      for (const mode of AWS_SCAN_MODES) {
        expect(resolveAwsScanMode(mode)).toBe(mode);
      }
    });
  });
});
