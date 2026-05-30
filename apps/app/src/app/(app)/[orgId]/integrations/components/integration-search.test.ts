import { describe, expect, it } from 'vitest';
import { matchesIntegrationSearch } from './integration-search';

describe('matchesIntegrationSearch', () => {
  it('matches SAST as its own searchable token', () => {
    expect(matchesIntegrationSearch('SAST scanning configuration', 'sast')).toBe(true);
  });

  it('does not match SAST inside disaster', () => {
    expect(matchesIntegrationSearch('Datto backup and disaster recovery platform', 'sast')).toBe(false);
  });

  it('keeps prefix matching for provider names', () => {
    expect(matchesIntegrationSearch('GitHub code hosting Development', 'git')).toBe(true);
  });

  it('requires every search term to match a token prefix', () => {
    expect(matchesIntegrationSearch('Aikido code security scanner', 'code scan')).toBe(true);
    expect(matchesIntegrationSearch('Aikido code security scanner', 'code backup')).toBe(false);
  });

  it('handles punctuation in search queries', () => {
    expect(matchesIntegrationSearch('SOC 2 compliance evidence', 'soc-2')).toBe(true);
  });
});
