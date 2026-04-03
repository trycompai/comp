import { describe, expect, it } from 'bun:test';
import { matchesSyncFilterTerms, parseSyncFilterTerms } from '../email-exclusion-terms';

describe('parseSyncFilterTerms', () => {
  it('normalizes and dedupes terms', () => {
    expect(parseSyncFilterTerms(['A@B.COM', 'a@b.com', ' x '])).toEqual(['a@b.com', 'x']);
  });
});

describe('matchesSyncFilterTerms', () => {
  it('matches full email exactly (case-insensitive via caller)', () => {
    expect(matchesSyncFilterTerms('user@example.com', ['user@example.com'])).toBe(true);
    expect(matchesSyncFilterTerms('user@example.com', ['other@example.com'])).toBe(false);
  });

  it('does not treat full-email terms as substrings', () => {
    expect(matchesSyncFilterTerms('alice@company.com', ['ice@company.com'])).toBe(false);
  });

  it('matches @domain suffix', () => {
    expect(matchesSyncFilterTerms('user@company.com', ['@company.com'])).toBe(true);
  });

  it('treats multi-segment domains as full-email terms (no substring false positives)', () => {
    expect(matchesSyncFilterTerms('user@domain.co.uk', ['other@domain.co.uk'])).toBe(false);
  });
});
