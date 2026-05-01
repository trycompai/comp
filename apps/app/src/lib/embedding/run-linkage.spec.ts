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

function emptyControls() {
  // Default `task.findMany` shape for the suggestions-enrichment lookup.
  return [] as unknown[];
}

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

  it('replace=true disconnects all tasks before linking', async () => {
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
      { id: 'tsk_a', title: 'awareness', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1', replace: true });

    // Expect disconnect-all (set: []) BEFORE the connect call.
    const updateCalls = dbMock.risk.update.mock.calls.map((c) => c[0]);
    expect(updateCalls[0]).toEqual({
      where: { id: 'rsk_1' },
      data: { tasks: { set: [] } },
    });
    expect(updateCalls[1]).toEqual({
      where: { id: 'rsk_1' },
      data: { tasks: { connect: [{ id: 'tsk_a' }] } },
    });
  });

  it('replace=true on a vendor disconnects vendor tasks', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([]);
    dbMock.vendor.findMany.mockResolvedValueOnce([
      { id: 'vnd_1', name: 'V', description: '', category: 'software_as_a_service' },
    ]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'review', description: '', department: Departments.gov },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.gov },
    ]);

    await runLinkage({ organizationId: 'org_1', vendorId: 'vnd_1', replace: true });

    const updateCalls = dbMock.vendor.update.mock.calls.map((c) => c[0]);
    expect(updateCalls[0]).toEqual({
      where: { id: 'vnd_1' },
      data: { tasks: { set: [] } },
    });
  });

  it('suggestionsOnly=true does NOT call db.risk.update and returns suggestions', async () => {
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
    dbMock.task.findMany
      .mockResolvedValueOnce([
        { id: 'tsk_a', title: 'Awareness', description: '', department: Departments.hr },
        { id: 'tsk_b', title: 'MFA', description: '', department: Departments.hr },
      ])
      // Enrichment lookup for suggestions.
      .mockResolvedValueOnce([
        {
          id: 'tsk_a',
          title: 'Awareness',
          status: 'todo',
          controls: [
            {
              id: 'ctl_1',
              name: 'Security Awareness',
              requirementsMapped: [
                {
                  frameworkInstance: { framework: { name: 'SOC 2' } },
                  requirement: { identifier: 'CC1.1' },
                  customRequirement: null,
                },
              ],
            },
          ],
        },
        {
          id: 'tsk_b',
          title: 'MFA',
          status: 'in_progress',
          controls: [
            {
              id: 'ctl_1',
              name: 'Security Awareness',
              requirementsMapped: [
                {
                  frameworkInstance: { framework: { name: 'SOC 2' } },
                  requirement: { identifier: 'CC1.1' },
                  customRequirement: null,
                },
              ],
            },
            {
              id: 'ctl_2',
              name: 'MFA Required',
              requirementsMapped: [
                {
                  frameworkInstance: { framework: { name: 'SOC 2' } },
                  requirement: { identifier: 'CC6.1' },
                  customRequirement: null,
                },
              ],
            },
          ],
        },
      ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
      { id: 'tsk_b', score: 0.95, department: Departments.hr },
    ]);

    const result = await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      suggestionsOnly: true,
    });

    // No persistence.
    expect(dbMock.risk.update).not.toHaveBeenCalled();

    // Suggestions populated and pinned to the risk.
    expect(result.suggestions?.forRiskId).toBe('rsk_1');
    expect(result.suggestions?.tasks.map((t) => t.id).sort()).toEqual(['tsk_a', 'tsk_b']);

    // Controls deduped by id (ctl_1 appears in both tasks but should only show once).
    const controlIds = result.suggestions?.controls.map((c) => c.id) ?? [];
    expect(controlIds).toHaveLength(2);
    expect(controlIds).toContain('ctl_1');
    expect(controlIds).toContain('ctl_2');

    // ctl_1 should carry the higher of the two task scores. linkSuggestions
    // applies a +0.05 same-department boost, so raw 0.95 → 1.00 (tsk_b) and
    // 0.9 → 0.95 (tsk_a). The dedupe should keep the larger score.
    const ctl1 = result.suggestions?.controls.find((c) => c.id === 'ctl_1');
    expect(ctl1?.score).toBeCloseTo(1.0, 5);
    expect(ctl1?.code).toBe('CC1.1');
    expect(ctl1?.framework).toBe('SOC 2');
    // viaTaskIds includes both tasks that brought it in.
    expect(ctl1?.viaTaskIds.sort()).toEqual(['tsk_a', 'tsk_b']);
  });

  it('suggestionsOnly=true wins over replace=true (no DB writes)', async () => {
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
    dbMock.task.findMany
      .mockResolvedValueOnce([
        { id: 'tsk_a', title: 'b', description: '', department: Departments.hr },
      ])
      .mockResolvedValueOnce([
        { id: 'tsk_a', title: 'b', status: 'todo', controls: [] },
      ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    void emptyControls();

    await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      replace: true,
      suggestionsOnly: true,
    });

    expect(dbMock.risk.update).not.toHaveBeenCalled();
  });

  it('replace=false (default) does not disconnect existing links', async () => {
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
      { id: 'tsk_a', title: 'b', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    // Only one update call: the connect. No `set: []` precedes it.
    const setCalls = dbMock.risk.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data.tasks.set !== undefined);
    expect(setCalls).toHaveLength(0);
  });
});
