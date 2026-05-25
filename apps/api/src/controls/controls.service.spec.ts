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

jest.mock('./sync-custom-framework-links', () => ({
  syncDirectLinksToCustomFrameworks: jest.fn().mockResolvedValue(undefined),
}));

const mockDb = {
  frameworkInstance: { findUnique: jest.fn() },
  control: { findUnique: jest.fn(), update: jest.fn() },
  policy: { findMany: jest.fn() },
  task: { findMany: jest.fn() },
  evidenceFormSetting: { findMany: jest.fn() },
  evidenceSubmission: { groupBy: jest.fn() },
  frameworkControlPolicyLink: { createMany: jest.fn() },
  frameworkControlTaskLink: { createMany: jest.fn() },
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
          controlDocumentTypes: [],
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
          controlDocumentTypes: [],
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

      it('should include direct document types', async () => {
        mockDb.control.findUnique.mockResolvedValue({
          id: controlId,
          organizationId: orgId,
          policies: [],
          tasks: [],
          controlDocumentTypes: [{ formType: 'SOC2_TYPE2' }],
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

        expect(result.controlDocumentTypes).toHaveLength(1);
        expect(result.controlDocumentTypes[0].formType).toBe('SOC2_TYPE2');
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
          controlDocumentTypes: [{ formType: 'SOC2_TYPE2' }],
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
        expect(result.controlDocumentTypes).toHaveLength(0);
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

  describe('linkPolicies', () => {
    const { syncDirectLinksToCustomFrameworks } = jest.requireMock(
      './sync-custom-framework-links',
    );

    it('should sync to custom frameworks when linking without frameworkInstanceId', async () => {
      mockDb.control.findUnique.mockResolvedValue({ id: 'ctrl_1' });
      mockDb.policy.findMany.mockResolvedValue([{ id: 'pol_1' }]);
      mockDb.control.update.mockResolvedValue({});

      await service.linkPolicies('ctrl_1', 'org_1', ['pol_1']);

      expect(syncDirectLinksToCustomFrameworks).toHaveBeenCalledWith({
        controlId: 'ctrl_1',
        organizationId: 'org_1',
      });
    });

    it('should NOT sync when linking with frameworkInstanceId', async () => {
      mockDb.control.findUnique.mockResolvedValue({ id: 'ctrl_1' });
      mockDb.policy.findMany.mockResolvedValue([{ id: 'pol_1' }]);
      mockDb.frameworkInstance.findUnique.mockResolvedValue({
        id: 'fi_1',
        customFrameworkId: null,
      });
      mockDb.frameworkControlPolicyLink.createMany.mockResolvedValue({
        count: 1,
      });

      await service.linkPolicies('ctrl_1', 'org_1', ['pol_1'], 'fi_1');

      expect(syncDirectLinksToCustomFrameworks).not.toHaveBeenCalled();
    });
  });

  describe('linkTasks', () => {
    const { syncDirectLinksToCustomFrameworks } = jest.requireMock(
      './sync-custom-framework-links',
    );

    it('should sync to custom frameworks when linking without frameworkInstanceId', async () => {
      mockDb.control.findUnique.mockResolvedValue({ id: 'ctrl_1' });
      mockDb.task.findMany.mockResolvedValue([{ id: 'task_1' }]);
      mockDb.control.update.mockResolvedValue({});

      await service.linkTasks('ctrl_1', 'org_1', ['task_1']);

      expect(syncDirectLinksToCustomFrameworks).toHaveBeenCalledWith({
        controlId: 'ctrl_1',
        organizationId: 'org_1',
      });
    });
  });
});
