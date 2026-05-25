import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ControlsService } from './controls.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: { control: ['create', 'read', 'update', 'delete'] },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

const mockDb = {
  frameworkInstance: { findUnique: jest.fn() },
  control: { findUnique: jest.fn() },
  evidenceFormSetting: { findMany: jest.fn() },
  evidenceSubmission: { groupBy: jest.fn() },
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
  EvidenceFormType: {},
  Prisma: { SortOrder: { asc: 'asc', desc: 'desc' } },
}));

describe('ControlsService', () => {
  let service: ControlsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlsService],
    }).compile();

    service = module.get(ControlsService);
    jest.clearAllMocks();
  });

  describe('findOne with frameworkInstanceId', () => {
    const orgId = 'org_1';
    const controlId = 'ctrl_1';

    const policyA = {
      id: 'pol_a',
      name: 'Policy A',
      status: 'published',
      archivedAt: null,
    };
    const policyB = {
      id: 'pol_b',
      name: 'Policy B',
      status: 'draft',
      archivedAt: null,
    };
    const taskA = {
      id: 'task_a',
      title: 'Task A',
      status: 'done',
      archivedAt: null,
    };
    const taskB = {
      id: 'task_b',
      title: 'Task B',
      status: 'todo',
      archivedAt: null,
    };

    beforeEach(() => {
      mockDb.evidenceFormSetting.findMany.mockResolvedValue([]);
      mockDb.evidenceSubmission.groupBy.mockResolvedValue([]);
    });

    describe('custom framework', () => {
      const frameworkInstanceId = 'fi_custom_1';

      beforeEach(() => {
        mockDb.frameworkInstance.findUnique.mockResolvedValue({
          id: frameworkInstanceId,
          customFrameworkId: 'cf_1',
        });
      });

      it('should include directly-linked policies/tasks when no framework-scoped links exist', async () => {
        mockDb.control.findUnique.mockResolvedValue({
          id: controlId,
          organizationId: orgId,
          policies: [policyA, policyB],
          tasks: [taskA, taskB],
          frameworkPolicyLinks: [],
          frameworkTaskLinks: [],
          frameworkDocumentLinks: [],
          requirementsMapped: [],
        });

        const result = await service.findOne(
          controlId,
          orgId,
          frameworkInstanceId,
        );

        expect(result.policies).toEqual([policyA, policyB]);
        expect(result.tasks).toEqual([taskA, taskB]);
        expect(result.progress.total).toBe(4);
      });

      it('should deduplicate when policies exist in both direct and framework-scoped links', async () => {
        mockDb.control.findUnique.mockResolvedValue({
          id: controlId,
          organizationId: orgId,
          policies: [policyA, policyB],
          tasks: [taskA],
          frameworkPolicyLinks: [{ policy: policyA }],
          frameworkTaskLinks: [{ task: taskA }, { task: taskB }],
          frameworkDocumentLinks: [],
          requirementsMapped: [],
        });

        const result = await service.findOne(
          controlId,
          orgId,
          frameworkInstanceId,
        );

        expect(result.policies).toHaveLength(2);
        expect(result.tasks).toHaveLength(2);
      });
    });

    describe('built-in framework', () => {
      const frameworkInstanceId = 'fi_builtin_1';

      beforeEach(() => {
        mockDb.frameworkInstance.findUnique.mockResolvedValue({
          id: frameworkInstanceId,
          customFrameworkId: null,
        });
      });

      it('should only show framework-scoped links, not direct links', async () => {
        mockDb.control.findUnique.mockResolvedValue({
          id: controlId,
          organizationId: orgId,
          policies: [policyA, policyB],
          tasks: [taskA, taskB],
          frameworkPolicyLinks: [{ policy: policyA }],
          frameworkTaskLinks: [{ task: taskA }],
          frameworkDocumentLinks: [],
          requirementsMapped: [],
        });

        const result = await service.findOne(
          controlId,
          orgId,
          frameworkInstanceId,
        );

        expect(result.policies).toEqual([policyA]);
        expect(result.tasks).toEqual([taskA]);
      });
    });

    it('should throw NotFoundException when control does not exist', async () => {
      mockDb.frameworkInstance.findUnique.mockResolvedValue({
        id: 'fi_1',
        customFrameworkId: null,
      });
      mockDb.control.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(controlId, orgId, 'fi_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
