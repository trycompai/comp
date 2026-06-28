import { describe, expect, it } from 'vitest';
import { matchesIntegrationNameSearch } from './integration-search';

describe('matchesIntegrationNameSearch', () => {
  it('matches integration names', () => {
    expect(matchesIntegrationNameSearch('GitHub', 'git')).toBe(true);
    expect(matchesIntegrationNameSearch('Google Workspace', 'workspace')).toBe(true);
  });

  it('does not match terms that only appear in descriptions', () => {
    expect(matchesIntegrationNameSearch('Datto', 'sast')).toBe(false);
  });

  it('requires every search term to match the name', () => {
    expect(matchesIntegrationNameSearch('Google Workspace', 'google work')).toBe(true);
    expect(matchesIntegrationNameSearch('Google Workspace', 'google backup')).toBe(false);
  });

  it('handles punctuation in name searches', () => {
    expect(matchesIntegrationNameSearch('SOC 2', 'soc-2')).toBe(true);
  });
});
