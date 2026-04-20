import { describe, expect, it } from 'bun:test';
import { filteredProjectsVariable, parseVercelProjectFilter } from '../variables';
import type { VariableFetchContext } from '../../../types';

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

describe('filteredProjectsVariable.fetchOptions', () => {
  it('paginates through all pages using pagination.next cursor', async () => {
    const requestedUrls: string[] = [];
    const ctx: VariableFetchContext = {
      accessToken: 'tok',
      graphql: (async () => ({})) as VariableFetchContext['graphql'],
      fetchAllPages: (async () => []) as VariableFetchContext['fetchAllPages'],
      fetch: (async <T,>(path: string): Promise<T> => {
        requestedUrls.push(path);
        if (path.includes('until=100')) {
          return {
            projects: [
              { id: 'prj_2', name: 'bbb', accountId: 'a', createdAt: 0, updatedAt: 0 },
            ],
            pagination: { count: 1, next: null, prev: null },
          } as unknown as T;
        }
        return {
          projects: [
            { id: 'prj_1', name: 'aaa', accountId: 'a', createdAt: 0, updatedAt: 0 },
          ],
          pagination: { count: 1, next: 100, prev: null },
        } as unknown as T;
      }) as VariableFetchContext['fetch'],
    };
    const options = await filteredProjectsVariable.fetchOptions!(ctx);
    expect(options.map((o) => o.value).sort()).toEqual(['prj_1', 'prj_2']);
    expect(requestedUrls.length).toBe(2);
    expect(requestedUrls[0]).toContain('limit=100');
    expect(requestedUrls[1]).toContain('until=100');
  });

  it('stops when pagination is missing or next is null', async () => {
    const ctx: VariableFetchContext = {
      accessToken: 'tok',
      graphql: (async () => ({})) as VariableFetchContext['graphql'],
      fetchAllPages: (async () => []) as VariableFetchContext['fetchAllPages'],
      fetch: (async <T,>(_path: string): Promise<T> =>
        ({
          projects: [
            { id: 'prj_1', name: 'a', accountId: 'x', createdAt: 0, updatedAt: 0 },
          ],
        }) as unknown as T) as VariableFetchContext['fetch'],
    };
    const options = await filteredProjectsVariable.fetchOptions!(ctx);
    expect(options).toEqual([{ value: 'prj_1', label: 'a' }]);
  });
});
