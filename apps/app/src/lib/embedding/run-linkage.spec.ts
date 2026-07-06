import { Departments } from '@db';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkagePhase } from './run-linkage';

const { dbMock, upsertMock, findSimilarTasksMock, waitForIndexedMock, pruneMock, rerankMock } = vi.hoisted(() => ({
  dbMock: {
    risk: { findMany: vi.fn(), update: vi.fn() },
    vendor: { findMany: vi.fn(), update: vi.fn() },
    task: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
  upsertMock: vi.fn(),
  findSimilarTasksMock: vi.fn(),
  waitForIndexedMock: vi.fn(),
  pruneMock: vi.fn(),
  rerankMock: vi.fn(),
}));

function emptyControls() {
  // Default `task.findMany` shape for the suggestions-enrichment lookup.
  return [] as unknown[];
}

vi.mock('@db/server', () => ({ db: dbMock }));

vi.mock('./index', () => ({
  upsertEntityEmbeddings: upsertMock,
  findSimilarTasks: findSimilarTasksMock,
  waitForIndexed: waitForIndexedMock,
  pruneOrphanTaskVectors: pruneMock,
}));

vi.mock('../rerank-suggestions', () => ({
  rerankSuggestions: rerankMock,
}));

import { runLinkage } from './run-linkage';

beforeEach(() => {
  upsertMock.mockReset();
  findSimilarTasksMock.mockReset();
  waitForIndexedMock.mockReset();
  // Default: index is already drained — runLinkage proceeds immediately.
  // Tests that exercise the race resolve `findSimilarTasks` differently
  // depending on call order rather than blocking on the wait.
  waitForIndexedMock.mockResolvedValue({ waitedMs: 0, polls: 1 });
  pruneMock.mockReset();
  // Default: a clean index — nothing to prune. Tests that exercise the sweep
  // override this per-test.
  pruneMock.mockResolvedValue({ deletedSourceIds: [], scanned: 0 });
  // Default: every entity is embedded as if for the first time. Tests that
  // exercise the cache-skip path override this per-test.
  upsertMock.mockImplementation(async ({ entities }: { entities: Array<{ id: string }> }) => ({
    appliedHashes: entities.map((e) => ({ id: e.id, hash: `hash_${e.id}` })),
    skippedCount: 0,
  }));
  rerankMock.mockReset();
  // Default reranker pass-through: scale cosine 0-1 → 0-10 so existing tests
  // that don't explicitly mock the reranker still get a deterministic order.
  rerankMock.mockImplementation(async ({ candidates }: { candidates: Array<{ id: string; cosineScore: number }> }) =>
    candidates
      .map((c) => ({ id: c.id, cosineScore: c.cosineScore, rerankScore: c.cosineScore * 10 }))
      .sort((a, b) => b.rerankScore - a.rerankScore),
  );
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

    // Expect disconnect-all (set: []) BEFORE the connect call. Filter to
    // only the task-link writes; embeddingHash writes intersperse them.
    const linkCalls = dbMock.risk.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data?.tasks !== undefined);
    expect(linkCalls[0]).toEqual({
      where: { id: 'rsk_1' },
      data: { tasks: { set: [] } },
    });
    expect(linkCalls[1]).toEqual({
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

    const linkCalls = dbMock.vendor.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data?.tasks !== undefined);
    expect(linkCalls[0]).toEqual({
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

    // No task-link persistence (the embeddingHash write is allowed —
    // suggestionsOnly still upserts vectors and should record their hashes
    // so subsequent runs can dedup).
    const linkCalls = dbMock.risk.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data?.tasks !== undefined);
    expect(linkCalls).toHaveLength(0);

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

    // suggestionsOnly wins → no link persistence. Hash writes still allowed.
    const linkCalls = dbMock.risk.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data?.tasks !== undefined);
    expect(linkCalls).toHaveLength(0);
  });

  it('suggestionsOnly=true reorders by LLM rerank score, not cosine', async () => {
    // Cosine ranks tsk_noise above tsk_real, but the reranker (the precision
    // step we added precisely for this case) boosts tsk_real to the top.
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'Data Leakage via Personal Laptops',
        description: 'Laptops can be lost or compromised',
        category: 'technology',
        department: Departments.it,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany
      .mockResolvedValueOnce([
        { id: 'tsk_real', title: 'Secure Devices', description: 'BitLocker, FileVault, MDM', department: Departments.it },
        { id: 'tsk_noise', title: 'Office Door Monitoring', description: 'Physical access', department: Departments.it },
      ])
      // Enrichment lookup for buildSuggestions.
      .mockResolvedValueOnce([
        { id: 'tsk_real', title: 'Secure Devices', status: 'todo', controls: [] },
        { id: 'tsk_noise', title: 'Office Door Monitoring', status: 'todo', controls: [] },
      ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_noise', score: 0.7, department: Departments.it },
      { id: 'tsk_real', score: 0.55, department: Departments.it },
    ]);
    // Override the default pass-through: the LLM says tsk_real is the primary
    // control (10) and tsk_noise is irrelevant (1).
    rerankMock.mockImplementationOnce(async () => [
      { id: 'tsk_real', cosineScore: 0.55, rerankScore: 10 },
      { id: 'tsk_noise', cosineScore: 0.7, rerankScore: 1 },
    ]);

    const result = await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      suggestionsOnly: true,
    });

    expect(result.suggestions?.tasks.map((t) => t.id)).toEqual(['tsk_real', 'tsk_noise']);
    expect(result.suggestions?.tasks[0].score).toBe(1.0); // 10/10 → 1.0
    expect(result.suggestions?.tasks[1].score).toBeCloseTo(0.1, 5); // 1/10 → 0.1
    expect(rerankMock).toHaveBeenCalledTimes(1);
    expect(rerankMock.mock.calls[0][0].source).toEqual({
      kind: 'risk',
      title: 'Data Leakage via Personal Laptops',
      description: 'Laptops can be lost or compromised',
      category: 'technology',
      department: Departments.it,
    });
  });

  it('suggestionsOnly=true falls back to cosine ordering when reranker throws', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'a',
        description: 'b',
        category: 'people',
        department: Departments.hr,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany
      .mockResolvedValueOnce([
        { id: 'tsk_a', title: 'A', description: 'a', department: Departments.hr },
        { id: 'tsk_b', title: 'B', description: 'b', department: Departments.hr },
      ])
      .mockResolvedValueOnce([
        { id: 'tsk_a', title: 'A', status: 'todo', controls: [] },
        { id: 'tsk_b', title: 'B', status: 'todo', controls: [] },
      ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.6, department: Departments.hr },
      { id: 'tsk_b', score: 0.9, department: Departments.hr },
    ]);
    rerankMock.mockRejectedValueOnce(new Error('OpenAI down'));

    const result = await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      suggestionsOnly: true,
    });

    // Fallback: ordered by cosine desc (with dept boost: 0.95, 0.65).
    expect(result.suggestions?.tasks.map((t) => t.id)).toEqual(['tsk_b', 'tsk_a']);
  });

  it('suggestionsOnly=true drops stale/orphan task vectors before the rerank-input slice (CS-681)', async () => {
    // Regression: findSimilarTasks filters only by org + sourceType, so it can
    // return orphan vectors for tasks no longer in the live scope (deleted, or
    // all controls archived after a framework change) — lib/embedding never
    // prunes them. When those orphans are the cosine-nearest they fill the
    // top-30 rerank-input slots and get dropped in the taskById intersection,
    // leaving the risk with zero suggestions. The one in-scope task must
    // survive by being filtered in BEFORE the slice.
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'Data Leakage',
        description: 'Sensitive data exposure',
        category: 'technology',
        department: null,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    // Live task scope contains ONLY tsk_live — the orphans below are NOT here.
    dbMock.task.findMany
      .mockResolvedValueOnce([
        { id: 'tsk_live', title: 'Encrypt Data at Rest', description: 'KMS', department: null },
      ])
      // Enrichment lookup for buildSuggestions (only reached once tsk_live survives).
      .mockResolvedValueOnce([
        { id: 'tsk_live', title: 'Encrypt Data at Rest', status: 'todo', controls: [] },
      ]);

    // 32 orphan vectors, all cosine-nearer than the one live task, followed by
    // the live task at the bottom. 32 > SUGGESTIONS_RERANK_INPUT_TOP_K (30), so
    // pre-fix the top-30 slice is entirely orphans and tsk_live never reaches
    // the reranker → zero suggestions.
    const orphans = Array.from({ length: 32 }, (_, i) => ({
      id: `tsk_orphan_${i}`,
      score: 0.99 - i * 0.01,
      department: undefined,
    }));
    findSimilarTasksMock.mockResolvedValueOnce([
      ...orphans,
      { id: 'tsk_live', score: 0.5, department: undefined },
    ]);

    const result = await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      suggestionsOnly: true,
    });

    // The in-scope task survives the slice → non-empty suggestions.
    expect(result.suggestions?.tasks.map((t) => t.id)).toEqual(['tsk_live']);
    // No orphan leaked into the suggestions.
    expect(result.suggestions?.tasks.some((t) => t.id.startsWith('tsk_orphan_'))).toBe(false);
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

    // No `set: []` (disconnect) call should appear. embeddingHash writes
    // and the connect call are fine; we just want to confirm we didn't
    // wipe existing links.
    const setCalls = dbMock.risk.update.mock.calls
      .map((c) => c[0])
      .filter((arg) => arg.data?.tasks?.set !== undefined);
    expect(setCalls).toHaveLength(0);
  });
});

describe('runLinkage waits for the vector index to drain before matching', () => {
  // ENG-221: 6 of 11 risks landed with 0 cosine candidates because their
  // queries fired before Upstash had finished indexing the just-upserted
  // task vectors. These tests pin the fix in place.

  it('emits waiting-for-index between embedding and matching phases', async () => {
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
    const embeddingTasksAt = names.indexOf('embedding-tasks');
    const waitAt = names.indexOf('waiting-for-index');
    const matchingAt = names.indexOf('matching-risks');

    expect(embeddingTasksAt).toBeGreaterThanOrEqual(0);
    expect(waitAt).toBeGreaterThan(embeddingTasksAt);
    expect(matchingAt).toBeGreaterThan(waitAt);
  });

  it('blocks findSimilarTasks until waitForIndexed resolves (race-condition guard)', async () => {
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

    // Track call order: any `findSimilarTasks` call before `waitForIndexed`
    // resolves would be a regression.
    const eventLog: string[] = [];
    let resolveWait: (() => void) | null = null;
    waitForIndexedMock.mockImplementationOnce(
      () =>
        new Promise<{ waitedMs: number; polls: number }>((resolve) => {
          eventLog.push('waitForIndexed:invoked');
          resolveWait = () => {
            eventLog.push('waitForIndexed:resolved');
            resolve({ waitedMs: 250, polls: 2 });
          };
        }),
    );
    findSimilarTasksMock.mockImplementationOnce(async () => {
      eventLog.push('findSimilarTasks:invoked');
      return [{ id: 'tsk_a', score: 0.9, department: Departments.hr }];
    });

    const runPromise = runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    // Yield enough microtasks for runLinkage to reach the wait. Without the
    // fix, findSimilarTasks would have been called by now.
    await new Promise((r) => setTimeout(r, 20));
    expect(eventLog).toEqual(['waitForIndexed:invoked']);
    expect(findSimilarTasksMock).not.toHaveBeenCalled();

    resolveWait!();
    await runPromise;

    expect(eventLog).toEqual([
      'waitForIndexed:invoked',
      'waitForIndexed:resolved',
      'findSimilarTasks:invoked',
    ]);
  });

  it('persists the new embedding hash on each entity that was actually re-embedded', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'Phishing',
        description: '',
        category: 'people',
        department: Departments.hr,
        embeddingHash: null,
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      {
        id: 'tsk_a',
        title: 'Awareness',
        description: '',
        department: Departments.hr,
        embeddingHash: null,
      },
      {
        id: 'tsk_b',
        title: 'Cached MFA',
        description: '',
        department: Departments.hr,
        embeddingHash: 'old_hash_b',
      },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);
    // Tasks: tsk_a is re-embedded with new hash, tsk_b is cached.
    upsertMock.mockImplementation(async ({ kind, entities }: { kind: string; entities: Array<{ id: string }> }) => {
      if (kind === 'task') {
        return {
          appliedHashes: [{ id: 'tsk_a', hash: 'new_hash_a' }],
          skippedCount: 1,
        };
      }
      return {
        appliedHashes: entities.map((e) => ({ id: e.id, hash: `hash_${e.id}` })),
        skippedCount: 0,
      };
    });

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    // tsk_a got the hash write; tsk_b was cached so no write.
    const taskUpdateCalls = dbMock.task.update.mock.calls.map((c) => c[0]);
    const hashWrite = taskUpdateCalls.find(
      (call) => call.where.id === 'tsk_a' && call.data.embeddingHash === 'new_hash_a',
    );
    expect(hashWrite).toBeDefined();
    expect(
      taskUpdateCalls.some(
        (call) => call.where.id === 'tsk_b' && call.data.embeddingHash !== undefined,
      ),
    ).toBe(false);

    // The risk also got embedded (it had null hash) → write its new hash.
    const riskUpdateCalls = dbMock.risk.update.mock.calls.map((c) => c[0]);
    expect(
      riskUpdateCalls.some(
        (call) => call.where.id === 'rsk_1' && call.data.embeddingHash === 'hash_rsk_1',
      ),
    ).toBe(true);
  });

  it('skips the index wait when every embedding is served from the cache', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      {
        id: 'rsk_1',
        title: 'Phishing',
        description: '',
        category: 'people',
        department: Departments.hr,
        embeddingHash: 'cached',
      },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      {
        id: 'tsk_a',
        title: 'Awareness',
        description: '',
        department: Departments.hr,
        embeddingHash: 'cached',
      },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);
    // Simulate every entity hitting the cache — no new vectors written.
    upsertMock.mockImplementation(async ({ entities }: { entities: Array<{ id: string }> }) => ({
      appliedHashes: [],
      skippedCount: entities.length,
    }));

    const phases: LinkagePhase[] = [];
    await runLinkage({
      organizationId: 'org_1',
      riskId: 'rsk_1',
      onPhase: (p) => phases.push(p),
    });

    // No upserts → no need to wait for the index to drain.
    expect(waitForIndexedMock).not.toHaveBeenCalled();
    expect(phases.some((p) => p.name === 'waiting-for-index')).toBe(false);
  });

  it('still proceeds when the index wait times out (logs but does not throw)', async () => {
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

    waitForIndexedMock.mockResolvedValueOnce({
      waitedMs: 30_000,
      polls: 120,
      pendingAtTimeout: 4,
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    // Linkage still completes — the floor mechanism downstream protects us
    // from zero-link risks even when some vectors are still pending.
    expect(result.riskLinks).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('runLinkage prunes orphan task vectors before matching (CS-681)', () => {
  // The real root cause: findSimilarTasks filters only by org + sourceType, so
  // stale/orphan task vectors (deleted tasks, or tasks whose controls were all
  // archived) accumulate in Upstash — lib/embedding has no delete path — and
  // crowd the live tasks out of the top-K cosine recall. When a risk's nearest
  // vectors are ALL orphans, post-recall filtering can't help (nothing real is
  // recalled), so the index itself must be cleaned before matching.

  it('calls pruneOrphanTaskVectors with the full live task scope', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      { id: 'rsk_1', title: 'a', description: '', category: 'people', department: Departments.hr },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'A', description: '', department: Departments.hr },
      { id: 'tsk_b', title: 'B', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    expect(pruneMock).toHaveBeenCalledTimes(1);
    const arg = pruneMock.mock.calls[0][0];
    expect(arg.organizationId).toBe('org_1');
    // liveTaskIds is the whole org task scope (not just this risk's matches).
    expect([...arg.liveTaskIds].sort()).toEqual(['tsk_a', 'tsk_b']);
  });

  it('clears the embeddingHash of pruned orphan tasks, scoped by org', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      { id: 'rsk_1', title: 'a', description: '', category: 'people', department: Departments.hr },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'A', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);
    pruneMock.mockResolvedValueOnce({
      deletedSourceIds: ['tsk_gone1', 'tsk_gone2'],
      scanned: 3,
    });

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    expect(dbMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['tsk_gone1', 'tsk_gone2'] }, organizationId: 'org_1' },
      data: { embeddingHash: null },
    });
  });

  it('does not touch embeddingHash when nothing was pruned', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      { id: 'rsk_1', title: 'a', description: '', category: 'people', department: Departments.hr },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'A', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);
    // Default pruneMock → deletedSourceIds: [].

    await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    expect(dbMock.task.updateMany).not.toHaveBeenCalled();
  });

  it('still completes the run when pruning throws (best-effort cleanup)', async () => {
    dbMock.risk.findMany.mockResolvedValueOnce([
      { id: 'rsk_1', title: 'a', description: '', category: 'people', department: Departments.hr },
    ]);
    dbMock.vendor.findMany.mockResolvedValueOnce([]);
    dbMock.task.findMany.mockResolvedValueOnce([
      { id: 'tsk_a', title: 'A', description: '', department: Departments.hr },
    ]);
    findSimilarTasksMock.mockResolvedValueOnce([
      { id: 'tsk_a', score: 0.9, department: Departments.hr },
    ]);
    pruneMock.mockRejectedValueOnce(new Error('upstash down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await runLinkage({ organizationId: 'org_1', riskId: 'rsk_1' });

    // Matching still runs — tsk_a is linked despite the failed prune.
    expect(result.riskLinks).toBe(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
