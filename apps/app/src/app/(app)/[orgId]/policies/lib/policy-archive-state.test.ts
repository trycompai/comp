import { describe, expect, it } from 'vitest';
import { isArchivedPolicy } from './policy-archive-state';

describe('isArchivedPolicy', () => {
  it('treats user-archived policies as archived', () => {
    expect(isArchivedPolicy({ isArchived: true, archivedAt: null })).toBe(true);
  });

  it('treats framework-sync-archived policies as archived', () => {
    expect(isArchivedPolicy({ isArchived: false, archivedAt: '2026-05-30T12:00:00Z' })).toBe(
      true,
    );
  });

  it('treats active policies as not archived', () => {
    expect(isArchivedPolicy({ isArchived: false, archivedAt: null })).toBe(false);
  });
});
