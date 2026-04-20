import { describe, expect, it } from 'bun:test';
import { parseVercelProjectFilter } from '../variables';

describe('parseVercelProjectFilter', () => {
  it('returns mode="all" and empty set when no variables are stored', () => {
    const result = parseVercelProjectFilter(undefined);
    expect(result.mode).toBe('all');
    expect(result.selectedIds.size).toBe(0);
  });

  it('returns mode="all" when project_filter_mode is missing', () => {
    const result = parseVercelProjectFilter({ filtered_projects: ['prj_1'] });
    expect(result.mode).toBe('all');
    expect(result.selectedIds.has('prj_1')).toBe(true);
  });

  it('returns mode="include" with selected ids', () => {
    const result = parseVercelProjectFilter({
      project_filter_mode: 'include',
      filtered_projects: ['prj_1', 'prj_2'],
    });
    expect(result.mode).toBe('include');
    expect(result.selectedIds.has('prj_1')).toBe(true);
    expect(result.selectedIds.has('prj_2')).toBe(true);
    expect(result.selectedIds.size).toBe(2);
  });

  it('returns mode="exclude" with selected ids', () => {
    const result = parseVercelProjectFilter({
      project_filter_mode: 'exclude',
      filtered_projects: ['prj_x'],
    });
    expect(result.mode).toBe('exclude');
    expect(result.selectedIds.has('prj_x')).toBe(true);
  });

  it('falls back to mode="all" on unknown mode strings', () => {
    const result = parseVercelProjectFilter({
      project_filter_mode: 'whatever',
      filtered_projects: ['prj_1'],
    });
    expect(result.mode).toBe('all');
  });

  it('treats non-array filtered_projects as empty selection', () => {
    const result = parseVercelProjectFilter({
      project_filter_mode: 'include',
      filtered_projects: 'prj_1' as unknown as string[],
    });
    expect(result.mode).toBe('include');
    expect(result.selectedIds.size).toBe(0);
  });
});
