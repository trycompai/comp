// Stub @db so importing applySync (which now uses Prisma.sql / Prisma.join at
// runtime for junction-table raw SQL) doesn't trigger real PrismaClient init.
jest.mock('@db', () => {
  // Minimal sql tag + join implementation sufficient for the tests (we don't
  // actually inspect the SQL output here — $executeRaw is jest.fn'd below).
  const sql = (strings: TemplateStringsArray, ..._values: unknown[]) => ({
    __sql: strings.raw.join('?'),
  });
  return {
    Prisma: {
      sql,
      join: (items: unknown[]) => ({ __sql: 'join', items }),
    },
    Frequency: { monthly: 'monthly', yearly: 'yearly', daily: 'daily', weekly: 'weekly' },
    Departments: { none: 'none', it: 'it' },
  };
});

import { applySync } from './framework-sync-apply';
import type { FrameworkManifest } from './manifest.types';

function manifest(overrides: Partial<FrameworkManifest> = {}): FrameworkManifest {
  return {
    framework: { id: 'frk_soc2', name: 'SOC 2', catalogVersion: '1', description: null },
    requirements: [], controls: [], policies: [], tasks: [],
    ...overrides,
  };
}

const baseInstance = {
  id: 'frm_1',
  organizationId: 'org_1',
  frameworkId: 'frk_soc2',
  currentVersionId: 'fvr_v1',
};

function mockTx() {
  return {
    control: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: `ctl_new_${Math.random()}` })), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    task: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: `tsk_new_${Math.random()}` })), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    policy: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: `pol_new_${Math.random()}` })), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    policyVersion: { create: jest.fn().mockResolvedValue({ id: 'pv_new', version: 2 }), findFirst: jest.fn().mockResolvedValue({ version: 1 }) },
    requirementMap: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: `rm_new_${Math.random()}` })), update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    frameworkInstance: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    frameworkSyncOperation: { create: jest.fn().mockResolvedValue({ id: 'fso_new' }) },
    controlDocumentType: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'cdt_new' }), delete: jest.fn() },
    $executeRaw: jest.fn().mockResolvedValue(0),
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as any;
}

describe('applySync', () => {
  it('creates new control instance when added in target manifest (no existing row in org)', async () => {
    const tx = mockTx();
    const result = await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: { id: 'fvr_v1', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_new', name: 'New Control', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.create).toHaveBeenCalledTimes(1);
    expect(tx.control.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org_1', name: 'New Control', description: 'd', controlTemplateId: 'ct_new' }),
    }));
    expect(result.syncOperationId).toBe('fso_new');
    expect(tx.frameworkInstance.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'frm_1' },
      data: expect.objectContaining({ currentVersionId: 'fvr_v2' }),
    }));
  });

  it('reuses existing control row when template is already present in org', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_existing', controlTemplateId: 'ct_shared', organizationId: 'org_1', name: 'X', description: 'Y' }]);
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: { id: 'fvr_v1', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_shared', name: 'X', description: 'Y', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.create).not.toHaveBeenCalled();
  });

  it('archives control when removed from target manifest and no other framework references it', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_stale', controlTemplateId: 'ct_old', organizationId: 'org_1', name: 'Old', description: 'd', archivedAt: null }]);
    tx.frameworkInstance.findMany.mockResolvedValue([]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_old', name: 'Old', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      targetVersion: { id: 'fvr_v2', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ctl_stale' },
      data: expect.objectContaining({ archivedAt: expect.any(Date) }),
    }));
  });

  it('does NOT archive control when another framework references it', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_shared', controlTemplateId: 'ct_shared', organizationId: 'org_1', name: 'X', description: 'Y', archivedAt: null }]);
    tx.frameworkInstance.findMany.mockResolvedValue([{
      id: 'frm_iso',
      currentVersion: { manifest: manifest({ controls: [{ id: 'ct_shared', name: 'X', description: 'Y', requirementIds: [], policyIds: [], taskIds: [] }] }) },
    }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_shared', name: 'X', description: 'Y', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      targetVersion: { id: 'fvr_v2', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ archivedAt: expect.any(Date) }) }));
  });

  it('overwrites control content when unedited', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'Old', description: 'd', archivedAt: null }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_1', name: 'Old', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_1', name: 'New', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ctl_1' },
      data: expect.objectContaining({ name: 'New', description: 'd' }),
    }));
  });

  it('preserves control content when customer-edited', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'My Edit', description: 'd', archivedAt: null }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_1', name: 'Old', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [{ id: 'ct_1', name: 'New', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.control.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ name: 'New' }),
    }));
  });

  it('creates a draft PolicyVersion for published policies when template content changes', async () => {
    const tx = mockTx();
    tx.policy.findMany.mockResolvedValue([{
      id: 'pol_1', policyTemplateId: 'pt_1', organizationId: 'org_1',
      name: 'Access', description: 'd', content: [{ old: true }], frequency: null, department: null,
      status: 'published', archivedAt: null,
    }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ policies: [{ id: 'pt_1', name: 'Access', description: 'd', content: [{ old: true }], frequency: null, department: null }] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ policies: [{ id: 'pt_1', name: 'Access', description: 'd', content: [{ new: true }], frequency: null, department: null }] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.policyVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ policyId: 'pol_1', content: { set: [{ new: true }] } }),
    }));
    expect(tx.policy.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ content: { set: [{ new: true }] } }),
    }));
  });

  it('creates an initial draft PolicyVersion when a policy is added', async () => {
    const tx = mockTx();
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: { id: 'fvr_v1', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          policies: [{ id: 'pt_new', name: 'New Policy', description: 'd', content: [{ body: 'x' }], frequency: null, department: null }],
        }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.policy.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ policyTemplateId: 'pt_new', status: 'draft' }),
    }));
    expect(tx.policyVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 1, content: { set: [{ body: 'x' }] } }),
    }));
  });

  it('creates RequirementMap edge when link appears in target manifest', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [{ id: 'ct_1', name: 'C', description: 'D', requirementIds: [], policyIds: [], taskIds: [] }],
        }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [{ id: 'ct_1', name: 'C', description: 'D', requirementIds: ['rq_1'], policyIds: [], taskIds: [] }],
        }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.requirementMap.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ controlId: 'ctl_1', requirementId: 'rq_1', frameworkInstanceId: 'frm_1' }),
    }));
  });

  it('archives RequirementMap edge when link disappears', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([{ id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null }]);
    tx.requirementMap.findMany.mockResolvedValue([{ id: 'rm_1', controlId: 'ctl_1', requirementId: 'rq_1', frameworkInstanceId: 'frm_1', archivedAt: null }]);

    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [{ id: 'ct_1', name: 'C', description: 'D', requirementIds: ['rq_1'], policyIds: [], taskIds: [] }],
        }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [{ id: 'ct_1', name: 'C', description: 'D', requirementIds: [], policyIds: [], taskIds: [] }],
        }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.requirementMap.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'rm_1' }),
      data: expect.objectContaining({ archivedAt: expect.any(Date) }),
    }));
  });

  // Drift regression: the diff alone misses edges the (backfilled) v1
  // manifest already claimed but the customer's actual rows never had.
  // Sync must reconcile against the to-manifest, not just the diff.
  it('creates missing RequirementMap edge when v1 and v2 both claim it but customer has no row (drift)', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([
      { id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null },
    ]);
    // Customer has no RequirementMap row for (ctl_1, rq_1) — drift between
    // backfilled v1.0.0 manifest and the customer's actual onboarding state.
    tx.requirementMap.findMany.mockResolvedValue([]);

    const sameControl = { id: 'ct_1', name: 'C', description: 'D', requirementIds: ['rq_1'], policyIds: [], taskIds: [] };
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [sameControl],
        }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [sameControl],
        }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.requirementMap.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ controlId: 'ctl_1', requirementId: 'rq_1', frameworkInstanceId: 'frm_1' }),
    }));
  });

  it('unarchives an existing archived RequirementMap row instead of creating a duplicate', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([
      { id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null },
    ]);
    const archivedAt = new Date('2026-01-01');
    tx.requirementMap.findMany.mockResolvedValue([
      { id: 'rm_archived', controlId: 'ctl_1', requirementId: 'rq_1', frameworkInstanceId: 'frm_1', archivedAt },
    ]);

    const sameControl = { id: 'ct_1', name: 'C', description: 'D', requirementIds: ['rq_1'], policyIds: [], taskIds: [] };
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [sameControl],
        }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({
          requirements: [{ id: 'rq_1', identifier: 'CC1', name: 'X', description: null }],
          controls: [sameControl],
        }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.requirementMap.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rm_archived' },
      data: { archivedAt: null },
    }));
    expect(tx.requirementMap.create).not.toHaveBeenCalled();
  });

  it('inserts missing _ControlToPolicy edge when v1 and v2 both claim it but customer has no row (drift)', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([
      { id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null },
    ]);
    tx.policy.findMany.mockResolvedValue([
      { id: 'pol_1', policyTemplateId: 'pt_1', organizationId: 'org_1', name: 'P', description: 'd', content: [], frequency: null, department: null, status: 'draft', archivedAt: null },
    ]);
    // Customer's _ControlToPolicy table has no edge for (ctl_1, pol_1).
    tx.$queryRaw.mockResolvedValue([]);

    const sameControl = { id: 'ct_1', name: 'C', description: 'D', requirementIds: [], policyIds: ['pt_1'], taskIds: [] };
    const samePolicy = { id: 'pt_1', name: 'P', description: 'd', content: [], frequency: null, department: null };
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl], policies: [samePolicy] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl], policies: [samePolicy] }),
      } as any,
      memberId: 'mem_1',
    });

    // The reconcile pass should have run an INSERT INTO _ControlToPolicy with
    // the missing pair. We can't easily inspect the SQL strings on Prisma's
    // tagged template through jest, so just assert $executeRaw was invoked.
    const calls = tx.$executeRaw.mock.calls.map((c: unknown[]) => String(c[0]?.[0] ?? ''));
    const cpInsertCalled = calls.some((s: string) => s.includes('INSERT INTO "_ControlToPolicy"'));
    expect(cpInsertCalled).toBe(true);
  });

  it('creates missing ControlDocumentType row when v1 and v2 both claim it but customer has no row (drift)', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([
      { id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null },
    ]);
    tx.controlDocumentType.findUnique.mockResolvedValue(null);

    const sameControl = {
      id: 'ct_1',
      name: 'C',
      description: 'D',
      requirementIds: [],
      policyIds: [],
      taskIds: [],
      documentTypes: ['infrastructure_inventory'],
    };
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl] }),
      } as any,
      memberId: 'mem_1',
    });

    expect(tx.controlDocumentType.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ controlId: 'ctl_1', formType: 'infrastructure_inventory' }),
    }));
  });

  it('does NOT re-insert a _ControlToPolicy edge that already exists in the customer DB (no double-undo)', async () => {
    const tx = mockTx();
    tx.control.findMany.mockResolvedValue([
      { id: 'ctl_1', controlTemplateId: 'ct_1', organizationId: 'org_1', name: 'C', description: 'D', archivedAt: null },
    ]);
    tx.policy.findMany.mockResolvedValue([
      { id: 'pol_1', policyTemplateId: 'pt_1', organizationId: 'org_1', name: 'P', description: 'd', content: [], frequency: null, department: null, status: 'draft', archivedAt: null },
    ]);
    // Edge already exists (e.g., another framework's onboarding created it).
    tx.$queryRaw.mockResolvedValue([{ A: 'ctl_1', B: 'pol_1' }]);

    const sameControl = { id: 'ct_1', name: 'C', description: 'D', requirementIds: [], policyIds: ['pt_1'], taskIds: [] };
    const samePolicy = { id: 'pt_1', name: 'P', description: 'd', content: [], frequency: null, department: null };
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: {
        id: 'fvr_v1',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl], policies: [samePolicy] }),
      } as any,
      targetVersion: {
        id: 'fvr_v2',
        frameworkId: 'frk_soc2',
        manifest: manifest({ controls: [sameControl], policies: [samePolicy] }),
      } as any,
      memberId: 'mem_1',
    });

    // Sync must not have written to _ControlToPolicy (nothing to add) and the
    // sync operation's undo payload must NOT claim it connected this edge —
    // otherwise rollback would delete a pre-existing edge another framework
    // still wants.
    const cpInserts = tx.$executeRaw.mock.calls.map((c: unknown[]) => String(c[0]?.[0] ?? ''))
      .filter((s: string) => s.includes('INSERT INTO "_ControlToPolicy"'));
    expect(cpInserts).toHaveLength(0);

    const undoPayload = tx.frameworkSyncOperation.create.mock.calls[0][0].data.undoPayload;
    expect(undoPayload.controlPolicyLinks.connected).toEqual([]);
  });

  it('writes a sync operation row with undoPayload and summary', async () => {
    const tx = mockTx();
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: { id: 'fvr_v1', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      targetVersion: { id: 'fvr_v2', frameworkId: 'frk_soc2', manifest: manifest({ controls: [{ id: 'ct_new', name: 'C', description: 'D', requirementIds: [], policyIds: [], taskIds: [] }] }) } as any,
      memberId: 'mem_1',
    });

    const createCall = tx.frameworkSyncOperation.create.mock.calls[0][0];
    expect(createCall.data).toMatchObject({
      frameworkInstanceId: 'frm_1',
      fromVersionId: 'fvr_v1',
      toVersionId: 'fvr_v2',
      kind: 'SYNC',
      performedById: 'mem_1',
    });
    expect(createCall.data.rollbackExpiresAt).toBeInstanceOf(Date);
    expect(createCall.data.undoPayload).toBeDefined();
    expect(createCall.data.summary).toBeDefined();
  });
});
