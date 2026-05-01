import { Departments } from '@db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkagePhase } from './run-linkage';

const { dbMock, upsertMock, findSimilarTasksMock } = vi.hoisted(() => ({
  dbMock: {
    risk: { findMany: vi.fn(), update: vi.fn() },
    vendor: { findMany: vi.fn(), update: vi.fn() },
    task: { findMany: vi.fn() },
  },
  upsertMock: vi.fn(),
  findSimilarTasksMock: vi.fn(),
}));

vi.mock('@db/server', () => ({ db: dbMock }));

vi.mock('./index', () => ({
  upsertEntityEmbeddings: upsertMock,
  findSimilarTasks: findSimilarTasksMock,
}));

import { runLinkage } from './run-linkage';

beforeEach(() => {
  upsertMock.mockReset();
  findSimilarTasksMock.mockReset();
  Object.values(dbMock).forEach((m) =>
    Object.values(m as Record<string, ReturnType<typeof vi.fn>>).forEach((fn) => fn.mockReset()),
  );
});

describe('runLinkage onPhase', () => {
  it('emits starting then done with zero counts when org has no tasks', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([]);

    const phases: LinkagePhase[] = [];
    await runLinkage({ organizationId: 'org_1', onPhase: (p) => phases.push(p) });

    expect(phases.map((p) => p.name)).toEqual(['starting', 'done']);
    expect(phases[1]).toEqual({ name: 'done', riskLinks: 0, vendorLinks: 0 });
  });

  it('emits embedding + matching phases with correct counts for a single risk', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'Phishing',
        description: '',
        category: 'people',
        department: Departments.hr,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'Awareness', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    const phases: LinkagePhase[] = [];
    await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      onPhase: (p) => phases.push(p),
    });

    const names = phases.map((p) => p.name);
    expect(names[0]).toBe('starting');
    expect(names).toContain('embedding-tasks');
    expect(names).toContain('embedding-risks');
    expect(names).toContain('matching-risks');
    expect(phases[phases.length - 1]).toEqual({
      name: 'done',
      riskLinks: 1,
      vendorLinks: 0,
    });
  });

  it('does not emit embedding-vendors when vendors list is empty', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'a',
        description: '',
        category: 'people',
        department: Departments.hr,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 't', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    const phases: LinkagePhase[] = [];
    await runLinkage({ organizationId: 'org_1', onPhase: (p) => phases.push(p) });

    expect(phases.some((p) => p.name === 'embedding-vendors')).toBe(false);
    expect(phases.some((p) => p.name === 'matching-vendors')).toBe(false);
  });

  it('does not invoke onPhase when caller omits the callback', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([]);

    await expect(runLinkage({ organizationId: 'org_1' })).resolves.toEqual({
      riskLinks: 0,
      vendorLinks: 0,
    });
  });
});
