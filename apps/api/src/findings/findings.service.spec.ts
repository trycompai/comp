import { BadRequestException, NotFoundException } from '@nestjs/common';

jest.mock('@trycompai/company', () => ({
  toDbEvidenceFormType: (v: string) => v,
  toExternalEvidenceFormType: (v: string | null) => v,
}));

const mockDb = {
  task: { findFirst: jest.fn() },
  evidenceSubmission: { findFirst: jest.fn(), findUnique: jest.fn() },
  policy: { findFirst: jest.fn() },
  vendor: { findFirst: jest.fn() },
  risk: { findFirst: jest.fn() },
  member: { findFirst: jest.fn(), findUnique: jest.fn() },
  device: { findFirst: jest.fn(), findUnique: jest.fn() },
  findingTemplate: { findUnique: jest.fn() },
  finding: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@db', () => ({
  db: mockDb,
  FindingArea: { people: 'people', documents: 'documents', compliance: 'compliance' },
  FindingStatus: {
    open: 'open',
    ready_for_review: 'ready_for_review',
    needs_revision: 'needs_revision',
    closed: 'closed',
  },
  FindingType: { soc2: 'soc2', iso27001: 'iso27001' },
  FindingSeverity: {
    low: 'low',
    medium: 'medium',
    high: 'high',
    critical: 'critical',
  },
}));

import { FindingsService } from './findings.service';

describe('FindingsService.create (target validator)', () => {
  const auditService = {};
  const notifier = { notifyFindingCreated: jest.fn() };
  const svc = new FindingsService(
    auditService as never,
    notifier as never,
  );
  const baseDto = { content: 'Example finding' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when no target and no area is provided', async () => {
    await expect(
      svc.create('org_1', 'mem_1', 'usr_1', { ...baseDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when more than one target is provided', async () => {
    await expect(
      svc.create('org_1', 'mem_1', 'usr_1', {
        ...baseDto,
        taskId: 'tsk_1',
        policyId: 'pol_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the referenced task is not in the org', async () => {
    mockDb.task.findFirst.mockResolvedValue(null);

    await expect(
      svc.create('org_1', 'mem_1', 'usr_1', {
        ...baseDto,
        taskId: 'tsk_missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a finding for a valid policy target', async () => {
    mockDb.policy.findFirst.mockResolvedValue({ id: 'pol_1', name: 'Access Policy' });
    mockDb.finding.create.mockResolvedValue({
      id: 'fnd_new',
      content: 'Example finding',
      createdBy: null,
      createdByAdmin: null,
    });

    const result = await svc.create('org_1', 'mem_1', 'usr_1', {
      ...baseDto,
      policyId: 'pol_1',
    });

    expect(mockDb.policy.findFirst).toHaveBeenCalledWith({
      where: { id: 'pol_1', organizationId: 'org_1' },
      select: { id: true, name: true },
    });
    expect(mockDb.finding.create).toHaveBeenCalled();
    const createArgs = mockDb.finding.create.mock.calls[0][0];
    expect(createArgs.data.policyId).toBe('pol_1');
    expect(createArgs.data.organizationId).toBe('org_1');
    expect(result.id).toBe('fnd_new');
  });

  it('accepts area-only findings without a specific target', async () => {
    mockDb.finding.create.mockResolvedValue({
      id: 'fnd_area',
      content: 'Example finding',
      createdBy: null,
      createdByAdmin: null,
    });

    await svc.create('org_1', 'mem_1', 'usr_1', {
      ...baseDto,
      area: 'people' as never,
    });

    const createArgs = mockDb.finding.create.mock.calls[0][0];
    expect(createArgs.data.area).toBe('people');
    expect(createArgs.data.taskId).toBeNull();
  });
});
