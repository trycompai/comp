import { describe, expect, it } from 'bun:test';
import {
  matchesGoogleWorkspaceSyncFilterTerms,
  parseGoogleWorkspaceSyncFilterTerms,
} from './sync-filter';

describe('parseGoogleWorkspaceSyncFilterTerms', () => {
  it('normalizes and dedupes terms', () => {
    expect(parseGoogleWorkspaceSyncFilterTerms(['A@B.COM', 'a@b.com', ' x '])).toEqual(['a@b.com', 'x']);
  });
});

describe('matchesGoogleWorkspaceSyncFilterTerms', () => {
  it('matches full email exactly (case-insensitive via caller)', () => {
    expect(matchesGoogleWorkspaceSyncFilterTerms('user@example.com', ['user@example.com'])).toBe(true);
    expect(matchesGoogleWorkspaceSyncFilterTerms('user@example.com', ['other@example.com'])).toBe(false);
  });

  it('does not treat full-email terms as substrings', () => {
    expect(matchesGoogleWorkspaceSyncFilterTerms('alice@company.com', ['ice@company.com'])).toBe(false);
  });

  it('matches @domain suffix', () => {
    expect(matchesGoogleWorkspaceSyncFilterTerms('user@company.com', ['@company.com'])).toBe(true);
  });

  it('treats multi-segment domains as full-email terms (no substring false positives)', () => {
    expect(matchesGoogleWorkspaceSyncFilterTerms('user@domain.co.uk', ['other@domain.co.uk'])).toBe(false);
  });
});
