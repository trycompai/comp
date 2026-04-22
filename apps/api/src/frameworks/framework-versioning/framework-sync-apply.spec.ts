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
    requirementMap: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: `rm_new_${Math.random()}` })), updateMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    frameworkInstance: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    frameworkSyncOperation: { create: jest.fn().mockResolvedValue({ id: 'fso_new' }) },
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
      userId: 'mem_1',
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
      userId: 'mem_1',
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
      userId: 'mem_1',
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
      userId: 'mem_1',
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
      userId: 'mem_1',
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
      userId: 'mem_1',
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
      userId: 'mem_1',
    });

    expect(tx.policyVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ policyId: 'pol_1', content: [{ new: true }] }),
    }));
    expect(tx.policy.update).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ content: [{ new: true }] }),
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
      userId: 'mem_1',
    });

    expect(tx.policy.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ policyTemplateId: 'pt_new', status: 'draft' }),
    }));
    expect(tx.policyVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ version: 1, content: [{ body: 'x' }] }),
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
      userId: 'mem_1',
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
      userId: 'mem_1',
    });

    expect(tx.requirementMap.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'rm_1' }),
      data: expect.objectContaining({ archivedAt: expect.any(Date) }),
    }));
  });

  it('writes a sync operation row with undoPayload and summary', async () => {
    const tx = mockTx();
    await applySync(tx, {
      instance: baseInstance as any,
      currentVersion: { id: 'fvr_v1', frameworkId: 'frk_soc2', manifest: manifest() } as any,
      targetVersion: { id: 'fvr_v2', frameworkId: 'frk_soc2', manifest: manifest({ controls: [{ id: 'ct_new', name: 'C', description: 'D', requirementIds: [], policyIds: [], taskIds: [] }] }) } as any,
      userId: 'mem_1',
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
