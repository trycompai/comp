import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTx = {
  frameworkInstance: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  control: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  policy: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  policyVersion: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  task: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  requirementMap: { createMany: vi.fn() },
  controlDocumentType: { createMany: vi.fn() },
  frameworkControlPolicyLink: { createMany: vi.fn() },
  frameworkControlTaskLink: { createMany: vi.fn() },
  frameworkControlDocumentTypeLink: { createMany: vi.fn() },
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
};

vi.mock('./load-framework-sources', () => ({
  loadFrameworkSources: vi.fn(),
}));

import { _upsertOrgFrameworkStructureCore } from './initialize-organization';
import { loadFrameworkSources } from './load-framework-sources';
import type { LoadedFrameworkSources } from './load-framework-sources';

const mockedLoadSources = vi.mocked(loadFrameworkSources);

function buildSources({
  frameworkId = 'fw_1',
  controlTemplateId = 'ct_1',
  policyTemplateId = 'pt_1',
  taskTemplateId = 'tt_1',
}: {
  frameworkId?: string;
  controlTemplateId?: string;
  policyTemplateId?: string;
  taskTemplateId?: string;
} = {}) {
  return {
    controlTemplates: [
      { id: controlTemplateId, name: 'C1', description: 'd', documentTypes: ['access-request'] },
    ],
    policyTemplates: [
      { id: policyTemplateId, name: 'P1', description: 'd', content: [], frequency: 'yearly', department: 'none' },
    ],
    taskTemplates: [
      { id: taskTemplateId, name: 'T1', description: 'd', frequency: null, department: null, automationStatus: 'AUTOMATED' },
    ],
    groupedRelations: [
      {
        frameworkId,
        controlTemplateId,
        requirementTemplateIds: ['req_1'],
        policyTemplateIds: [policyTemplateId],
        taskTemplateIds: [taskTemplateId],
        documentTypes: ['access-request'],
      },
    ],
    latestVersionByFrameworkId: new Map([[frameworkId, 'fv_1']]),
    frameworksWithoutVersion: [],
    requirementToFrameworkId: new Map([['req_1', frameworkId]]),
  } satisfies Record<string, unknown> as unknown as LoadedFrameworkSources;
}

describe('_upsertOrgFrameworkStructureCore', () => {
  const ORG_ID = 'org_test';
  const FRAMEWORK_EDITOR_ID = 'fw_1';
  const FRAMEWORK_INSTANCE_ID = 'fi_1';
  const CONTROL_ID = 'ctrl_1';
  const POLICY_ID = 'pol_1';
  const TASK_ID = 'tsk_1';

  beforeEach(() => {
    vi.clearAllMocks();

    mockedLoadSources.mockResolvedValue(buildSources());

    // No existing framework instances
    mockTx.frameworkInstance.findMany
      .mockResolvedValueOnce([]) // existing check
      .mockResolvedValueOnce([{ id: FRAMEWORK_INSTANCE_ID, frameworkId: FRAMEWORK_EDITOR_ID }]); // all instances

    mockTx.frameworkInstance.createMany.mockResolvedValue({ count: 1 });

    // No existing controls/policies/tasks
    mockTx.control.findMany
      .mockResolvedValueOnce([]) // existing check
      .mockResolvedValueOnce([{ id: CONTROL_ID, controlTemplateId: 'ct_1' }]); // all controls
    mockTx.control.createMany.mockResolvedValue({ count: 1 });

    mockTx.policy.findMany
      .mockResolvedValueOnce([]) // existing check
      .mockResolvedValueOnce([{ id: POLICY_ID, policyTemplateId: 'pt_1' }]); // all policies
    mockTx.policy.createMany.mockResolvedValue({ count: 1 });

    mockTx.$queryRaw.mockResolvedValue([{ policy_id: POLICY_ID, version_id: 'pv_1' }]);
    mockTx.policyVersion.createMany.mockResolvedValue({ count: 1 });
    mockTx.$executeRaw.mockResolvedValue(1);

    mockTx.task.findMany
      .mockResolvedValueOnce([]) // existing check
      .mockResolvedValueOnce([{ id: TASK_ID, taskTemplateId: 'tt_1' }]); // all tasks
    mockTx.task.createMany.mockResolvedValue({ count: 1 });

    mockTx.requirementMap.createMany.mockResolvedValue({ count: 1 });
    mockTx.controlDocumentType.createMany.mockResolvedValue({ count: 1 });
    mockTx.frameworkControlPolicyLink.createMany.mockResolvedValue({ count: 1 });
    mockTx.frameworkControlTaskLink.createMany.mockResolvedValue({ count: 1 });
    mockTx.frameworkControlDocumentTypeLink.createMany.mockResolvedValue({ count: 1 });
  });

  const callUpsert = () =>
    _upsertOrgFrameworkStructureCore({
      organizationId: ORG_ID,
      targetFrameworkEditorIds: [FRAMEWORK_EDITOR_ID],
      frameworkEditorFrameworks: [
        { id: FRAMEWORK_EDITOR_ID, name: 'SOC 2', requirements: [] } as any,
      ],
      tx: mockTx as any,
    });

  it('creates FrameworkControlPolicyLink entries alongside _ControlToPolicy', async () => {
    await callUpsert();

    // Old table: _ControlToPolicy via $executeRaw (called at least once for policies)
    expect(mockTx.$executeRaw).toHaveBeenCalled();

    // New table: FrameworkControlPolicyLink
    expect(mockTx.frameworkControlPolicyLink.createMany).toHaveBeenCalledWith({
      data: [
        {
          frameworkInstanceId: FRAMEWORK_INSTANCE_ID,
          controlId: CONTROL_ID,
          policyId: POLICY_ID,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('creates FrameworkControlTaskLink entries alongside _ControlToTask', async () => {
    await callUpsert();

    // Old table: _ControlToTask via $executeRaw
    expect(mockTx.$executeRaw).toHaveBeenCalled();

    expect(mockTx.frameworkControlTaskLink.createMany).toHaveBeenCalledWith({
      data: [
        {
          frameworkInstanceId: FRAMEWORK_INSTANCE_ID,
          controlId: CONTROL_ID,
          taskId: TASK_ID,
        },
      ],
      skipDuplicates: true,
    });
  });

  it('creates FrameworkControlDocumentTypeLink entries alongside ControlDocumentType', async () => {
    await callUpsert();

    expect(mockTx.controlDocumentType.createMany).toHaveBeenCalled();

    expect(mockTx.frameworkControlDocumentTypeLink.createMany).toHaveBeenCalledWith({
      data: [
        {
          frameworkInstanceId: FRAMEWORK_INSTANCE_ID,
          controlId: CONTROL_ID,
          formType: 'access-request',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('skips framework-scoped links when frameworkInstanceId cannot be resolved', async () => {
    mockedLoadSources.mockResolvedValue(
      buildSources({ frameworkId: 'fw_unknown' }),
    );

    await callUpsert();

    expect(mockTx.frameworkControlPolicyLink.createMany).not.toHaveBeenCalled();
    expect(mockTx.frameworkControlTaskLink.createMany).not.toHaveBeenCalled();
    expect(mockTx.frameworkControlDocumentTypeLink.createMany).not.toHaveBeenCalled();
  });

  it('handles control appearing in multiple frameworks', async () => {
    const FI_2 = 'fi_2';
    mockedLoadSources.mockResolvedValue({
      ...buildSources(),
      groupedRelations: [
        {
          frameworkId: FRAMEWORK_EDITOR_ID,
          controlTemplateId: 'ct_1',
          requirementTemplateIds: ['req_1'],
          policyTemplateIds: ['pt_1'],
          taskTemplateIds: [],
          documentTypes: [],
        },
        {
          frameworkId: 'fw_2',
          controlTemplateId: 'ct_1',
          requirementTemplateIds: ['req_2'],
          policyTemplateIds: ['pt_1'],
          taskTemplateIds: [],
          documentTypes: [],
        },
      ],
    } as LoadedFrameworkSources);

    // Return both framework instances
    mockTx.frameworkInstance.findMany
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: FRAMEWORK_INSTANCE_ID, frameworkId: FRAMEWORK_EDITOR_ID },
        { id: FI_2, frameworkId: 'fw_2' },
      ]);

    await callUpsert();

    expect(mockTx.frameworkControlPolicyLink.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { frameworkInstanceId: FRAMEWORK_INSTANCE_ID, controlId: CONTROL_ID, policyId: POLICY_ID },
        { frameworkInstanceId: FI_2, controlId: CONTROL_ID, policyId: POLICY_ID },
      ]),
      skipDuplicates: true,
    });
  });
});
