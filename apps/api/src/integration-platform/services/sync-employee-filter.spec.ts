import { resolveSyncEmployeeFilter } from './sync-employee-filter';

describe('resolveSyncEmployeeFilter', () => {
  it('defaults to mode "all" when no variables are set', () => {
    expect(resolveSyncEmployeeFilter({})).toEqual({
      mode: 'all',
      excludedTerms: [],
      includedTerms: [],
    });
  });

  it('defaults to mode "all" when the mode is unknown', () => {
    expect(
      resolveSyncEmployeeFilter({ sync_user_filter_mode: 'bogus' }).mode,
    ).toBe('all');
  });

  it('parses exclude terms from a comma/newline separated string', () => {
    const result = resolveSyncEmployeeFilter({
      sync_user_filter_mode: 'exclude',
      sync_excluded_emails: 'a@example.com, b@example.com\nc@example.com',
    });

    expect(result.mode).toBe('exclude');
    expect(result.excludedTerms).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
    ]);
  });

  it('honors include mode when an include list is provided', () => {
    const result = resolveSyncEmployeeFilter({
      sync_user_filter_mode: 'include',
      sync_included_emails: ['keep@example.com'],
    });

    expect(result.mode).toBe('include');
    expect(result.includedTerms).toEqual(['keep@example.com']);
  });

  it('falls back to "all" when include mode is selected with an empty list (never silently drops everyone)', () => {
    expect(
      resolveSyncEmployeeFilter({
        sync_user_filter_mode: 'include',
        sync_included_emails: '',
      }).mode,
    ).toBe('all');
  });
});
