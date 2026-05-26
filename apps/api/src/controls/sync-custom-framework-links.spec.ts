import { syncDirectLinksToCustomFrameworks } from './sync-custom-framework-links';

const mockDb = {
  frameworkInstance: { count: jest.fn() },
  requirementMap: { findMany: jest.fn() },
  control: { findUnique: jest.fn() },
  frameworkControlPolicyLink: { createMany: jest.fn() },
  frameworkControlTaskLink: { createMany: jest.fn() },
  frameworkControlDocumentTypeLink: { createMany: jest.fn() },
};

jest.mock('@db', () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        return mockDb[prop] ?? {};
      },
    },
  ),
  Prisma: {},
}));

describe('syncDirectLinksToCustomFrameworks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should skip entirely when org has no custom frameworks', async () => {
    mockDb.frameworkInstance.count.mockResolvedValue(0);

    await syncDirectLinksToCustomFrameworks({
      controlId: 'ctrl_1',
      organizationId: 'org_1',
    });

    expect(mockDb.requirementMap.findMany).not.toHaveBeenCalled();
    expect(mockDb.control.findUnique).not.toHaveBeenCalled();
  });

  it('should do nothing when control is not mapped to any custom framework', async () => {
    mockDb.frameworkInstance.count.mockResolvedValue(1);
    mockDb.requirementMap.findMany.mockResolvedValue([]);

    await syncDirectLinksToCustomFrameworks({
      controlId: 'ctrl_1',
      organizationId: 'org_1',
    });

    expect(mockDb.control.findUnique).not.toHaveBeenCalled();
  });

  it('should create framework-scoped links for all custom FIs', async () => {
    mockDb.frameworkInstance.count.mockResolvedValue(2);
    mockDb.requirementMap.findMany.mockResolvedValue([
      { frameworkInstanceId: 'fi_1' },
      { frameworkInstanceId: 'fi_2' },
    ]);
    mockDb.control.findUnique.mockResolvedValue({
      id: 'ctrl_1',
      policies: [{ id: 'pol_a' }, { id: 'pol_b' }],
      tasks: [{ id: 'task_a' }],
      controlDocumentTypes: [{ formType: 'SOC2_TYPE2' }],
    });
    mockDb.frameworkControlPolicyLink.createMany.mockResolvedValue({
      count: 4,
    });
    mockDb.frameworkControlTaskLink.createMany.mockResolvedValue({ count: 2 });
    mockDb.frameworkControlDocumentTypeLink.createMany.mockResolvedValue({
      count: 2,
    });

    await syncDirectLinksToCustomFrameworks({
      controlId: 'ctrl_1',
      organizationId: 'org_1',
    });

    expect(mockDb.frameworkControlPolicyLink.createMany).toHaveBeenCalledWith({
      data: [
        {
          frameworkInstanceId: 'fi_1',
          controlId: 'ctrl_1',
          policyId: 'pol_a',
        },
        {
          frameworkInstanceId: 'fi_1',
          controlId: 'ctrl_1',
          policyId: 'pol_b',
        },
        {
          frameworkInstanceId: 'fi_2',
          controlId: 'ctrl_1',
          policyId: 'pol_a',
        },
        {
          frameworkInstanceId: 'fi_2',
          controlId: 'ctrl_1',
          policyId: 'pol_b',
        },
      ],
      skipDuplicates: true,
    });

    expect(mockDb.frameworkControlTaskLink.createMany).toHaveBeenCalledWith({
      data: [
        { frameworkInstanceId: 'fi_1', controlId: 'ctrl_1', taskId: 'task_a' },
        { frameworkInstanceId: 'fi_2', controlId: 'ctrl_1', taskId: 'task_a' },
      ],
      skipDuplicates: true,
    });

    expect(
      mockDb.frameworkControlDocumentTypeLink.createMany,
    ).toHaveBeenCalledWith({
      data: [
        {
          frameworkInstanceId: 'fi_1',
          controlId: 'ctrl_1',
          formType: 'SOC2_TYPE2',
        },
        {
          frameworkInstanceId: 'fi_2',
          controlId: 'ctrl_1',
          formType: 'SOC2_TYPE2',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('should skip empty direct relationships', async () => {
    mockDb.frameworkInstance.count.mockResolvedValue(1);
    mockDb.requirementMap.findMany.mockResolvedValue([
      { frameworkInstanceId: 'fi_1' },
    ]);
    mockDb.control.findUnique.mockResolvedValue({
      id: 'ctrl_1',
      policies: [],
      tasks: [],
      controlDocumentTypes: [],
    });

    await syncDirectLinksToCustomFrameworks({
      controlId: 'ctrl_1',
      organizationId: 'org_1',
    });

    expect(mockDb.frameworkControlPolicyLink.createMany).not.toHaveBeenCalled();
    expect(mockDb.frameworkControlTaskLink.createMany).not.toHaveBeenCalled();
    expect(
      mockDb.frameworkControlDocumentTypeLink.createMany,
    ).not.toHaveBeenCalled();
  });
});
