import { Test, TestingModule } from '@nestjs/testing';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';

jest.mock('../auth/auth.server', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {
    policy: ['create', 'read', 'update', 'delete'],
    control: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('@db', () => ({
  db: {
    policy: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    control: {
      findMany: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    frameworkInstance: {
      findMany: jest.fn(),
    },
    context: {
      findMany: jest.fn(),
    },
    policyVersion: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    frameworkControlPolicyLink: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  Frequency: {
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
  PolicyStatus: {
    draft: 'draft',
    published: 'published',
  },
  BackgroundCheckStatus: {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    completed_with_flags: 'completed_with_flags',
    failed: 'failed',
  },
  FindingType: {
    soc2: 'soc2',
    iso27001: 'iso27001',
    hipaa: 'hipaa',
    gdpr: 'gdpr',
    nist: 'nist',
  },
  FindingStatus: {
    open: 'open',
    closed: 'closed',
  },
  PhaseCompletionType: {},
  TimelinePhaseStatus: {},
  TimelineStatus: {},
}));

jest.mock('@trigger.dev/sdk', () => ({
  auth: { createPublicToken: jest.fn() },
  tasks: { trigger: jest.fn() },
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));

jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToModelMessages: jest.fn(),
}));

describe('PoliciesController', () => {
  let controller: PoliciesController;
  let policiesService: jest.Mocked<PoliciesService>;

  const mockPoliciesService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
    publishAll: jest.fn(),
    downloadAllPoliciesPdf: jest.fn(),
    getVersions: jest.fn(),
    getVersionById: jest.fn(),
    createVersion: jest.fn(),
    updateVersionContent: jest.fn(),
    deleteVersion: jest.fn(),
    publishVersion: jest.fn(),
    setActiveVersion: jest.fn(),
    submitForApproval: jest.fn(),
    acceptChanges: jest.fn(),
    denyChanges: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
  };

  const orgId = 'org_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PoliciesController],
      providers: [{ provide: PoliciesService, useValue: mockPoliciesService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<PoliciesController>(PoliciesController);
    policiesService = module.get(PoliciesService);

    jest.clearAllMocks();
  });

  describe('getAllPolicies', () => {
    it('should call policiesService.findAll and return wrapped response', async () => {
      const mockPolicies = [{ id: 'pol_1', name: 'Policy 1' }];
      mockPoliciesService.findAll.mockResolvedValue(mockPolicies);

      const result = await controller.getAllPolicies(orgId, mockAuthContext);

      expect(policiesService.findAll).toHaveBeenCalledWith({
        organizationId: orgId,
        excludeContent: false,
        includeArchived: false,
      });
      expect(result).toEqual({
        data: mockPolicies,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });

    it('should pass excludeContent=true to service when query param is "true"', async () => {
      mockPoliciesService.findAll.mockResolvedValue([]);

      await controller.getAllPolicies(orgId, mockAuthContext, 'true');

      expect(policiesService.findAll).toHaveBeenCalledWith({
        organizationId: orgId,
        excludeContent: true,
        includeArchived: false,
      });
    });

    it('should treat any non-"true" excludeContent value as false', async () => {
      mockPoliciesService.findAll.mockResolvedValue([]);

      await controller.getAllPolicies(orgId, mockAuthContext, 'false');

      expect(policiesService.findAll).toHaveBeenCalledWith({
        organizationId: orgId,
        excludeContent: false,
        includeArchived: false,
      });
    });

    it('should pass includeArchived=true to service when query param is "true"', async () => {
      mockPoliciesService.findAll.mockResolvedValue([]);

      await controller.getAllPolicies(orgId, mockAuthContext, undefined, 'true');

      expect(policiesService.findAll).toHaveBeenCalledWith({
        organizationId: orgId,
        excludeContent: false,
        includeArchived: true,
      });
    });

    it('should omit authenticatedUser when userId is not present', async () => {
      const noUserContext: AuthContext = {
        ...mockAuthContext,
        userId: undefined,
        userEmail: undefined,
      };
      mockPoliciesService.findAll.mockResolvedValue([]);

      const result = await controller.getAllPolicies(orgId, noUserContext);

      expect(result).toEqual({
        data: [],
        authType: 'session',
      });
      expect(result).not.toHaveProperty('authenticatedUser');
    });
  });

  describe('publishAllPolicies', () => {
    it('should call policiesService.publishAll with correct params', async () => {
      const mockResult = { count: 3 };
      mockPoliciesService.publishAll.mockResolvedValue(mockResult);

      const result = await controller.publishAllPolicies(
        orgId,
        mockAuthContext,
      );

      expect(policiesService.publishAll).toHaveBeenCalledWith(
        orgId,
        'usr_123',
        undefined,
      );
      expect(result).toEqual({
        count: 3,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('downloadAllPolicies', () => {
    it('should call policiesService.downloadAllPoliciesPdf', async () => {
      const mockResult = { url: 'https://s3.example.com/bundle.pdf' };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      const result = await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        undefined,
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        undefined,
      );
      expect(result).toEqual({
        url: 'https://s3.example.com/bundle.pdf',
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });

    it('parses comma-separated policyIds and passes an array to the service', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 2 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        'p1, p2 ,p3',
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        ['p1', 'p2', 'p3'],
      );
    });

    it('dedupes policyIds and strips empty entries', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 1 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        'p1,,p1,p2,',
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        ['p1', 'p2'],
      );
    });

    it('passes undefined when policyIds query is missing', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 10 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        undefined,
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        undefined,
      );
    });

    it('passes undefined when policyIds query is an empty string', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 10 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        '',
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        undefined,
      );
    });

    it('handles repeated-key array form (policyIds=a&policyIds=b)', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 2 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        ['p1', 'p2'],
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        ['p1', 'p2'],
      );
    });

    it('handles mixed array form where each value itself contains commas', async () => {
      const mockResult = { downloadUrl: 'https://s3/signed', name: 'all-policies', policyCount: 3 };
      mockPoliciesService.downloadAllPoliciesPdf.mockResolvedValue(mockResult);

      await controller.downloadAllPolicies(
        orgId,
        mockAuthContext,
        ['p1,p2', 'p3'],
      );

      expect(policiesService.downloadAllPoliciesPdf).toHaveBeenCalledWith(
        orgId,
        ['p1', 'p2', 'p3'],
      );
    });
  });

  describe('getPolicy', () => {
    it('should call policiesService.findById with id and orgId', async () => {
      const mockPolicy = { id: 'pol_1', name: 'Test Policy' };
      mockPoliciesService.findById.mockResolvedValue(mockPolicy);

      const result = await controller.getPolicy(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.findById).toHaveBeenCalledWith('pol_1', orgId);
      expect(result).toEqual({
        id: 'pol_1',
        name: 'Test Policy',
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('createPolicy', () => {
    it('should call policiesService.create with orgId and createData', async () => {
      const createData = { name: 'New Policy' };
      const mockPolicy = { id: 'pol_2', name: 'New Policy' };
      mockPoliciesService.create.mockResolvedValue(mockPolicy);

      const result = await controller.createPolicy(
        createData as never,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.create).toHaveBeenCalledWith(orgId, createData);
      expect(result).toEqual({
        id: 'pol_2',
        name: 'New Policy',
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('updatePolicy', () => {
    it('should call policiesService.updateById with correct params', async () => {
      const updateData = { name: 'Updated Policy' };
      const mockPolicy = { id: 'pol_1', name: 'Updated Policy' };
      mockPoliciesService.updateById.mockResolvedValue(mockPolicy);

      const result = await controller.updatePolicy(
        'pol_1',
        updateData as never,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.updateById).toHaveBeenCalledWith(
        'pol_1',
        orgId,
        updateData,
      );
      expect(result).toEqual({
        id: 'pol_1',
        name: 'Updated Policy',
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('deletePolicy', () => {
    it('should call policiesService.deleteById with correct params', async () => {
      const mockResult = { deleted: true };
      mockPoliciesService.deleteById.mockResolvedValue(mockResult);

      const result = await controller.deletePolicy(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.deleteById).toHaveBeenCalledWith('pol_1', orgId);
      expect(result).toEqual({
        deleted: true,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('getPolicyControls', () => {
    it('returns mapped and all controls with framework names derived from requirementsMapped', async () => {
      const { db } = require('@db');
      const mappedControls = [
        {
          id: 'ctrl_1',
          name: 'Control 1',
          description: 'desc',
          requirementsMapped: [
            {
              frameworkInstance: {
                id: 'fi_1',
                framework: { id: 'fw_soc2', name: 'SOC 2' },
                customFramework: null,
              },
            },
            {
              frameworkInstance: {
                id: 'fi_2',
                framework: null,
                customFramework: { id: 'cfw_1', name: 'Internal Policy' },
              },
            },
          ],
        },
      ];
      const allControls = [
        ...mappedControls,
        {
          id: 'ctrl_2',
          name: 'Control 2',
          description: 'desc2',
          requirementsMapped: [],
        },
      ];
      db.policy.findFirst.mockResolvedValue({
        id: 'pol_1',
        controls: mappedControls,
      });
      db.control.findMany.mockResolvedValue(allControls);

      const result = await controller.getPolicyControls(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(result.mappedControls).toEqual([
        {
          id: 'ctrl_1',
          name: 'Control 1',
          description: 'desc',
          frameworks: [
            { id: 'fw_soc2', name: 'SOC 2' },
            { id: 'cfw_1', name: 'Internal Policy' },
          ],
        },
      ]);
      expect(result.allControls).toEqual([
        {
          id: 'ctrl_1',
          name: 'Control 1',
          description: 'desc',
          frameworks: [
            { id: 'fw_soc2', name: 'SOC 2' },
            { id: 'cfw_1', name: 'Internal Policy' },
          ],
        },
        {
          id: 'ctrl_2',
          name: 'Control 2',
          description: 'desc2',
          frameworks: [],
        },
      ]);
      expect(result.authType).toBe('session');
    });

    it('dedupes frameworks when the same FrameworkInstance is reachable via multiple RequirementMaps', async () => {
      const { db } = require('@db');
      const controls = [
        {
          id: 'ctrl_1',
          name: 'Control 1',
          description: 'desc',
          requirementsMapped: [
            {
              frameworkInstance: {
                id: 'fi_1',
                framework: { id: 'fw_soc2', name: 'SOC 2' },
                customFramework: null,
              },
            },
            {
              frameworkInstance: {
                id: 'fi_1',
                framework: { id: 'fw_soc2', name: 'SOC 2' },
                customFramework: null,
              },
            },
          ],
        },
      ];
      db.policy.findFirst.mockResolvedValue({
        id: 'pol_1',
        controls,
      });
      db.control.findMany.mockResolvedValue(controls);

      const result = await controller.getPolicyControls(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(result.mappedControls[0].frameworks).toEqual([
        { id: 'fw_soc2', name: 'SOC 2' },
      ]);
    });

    it('returns empty mappedControls when policy is not found', async () => {
      const { db } = require('@db');
      db.policy.findFirst.mockResolvedValue(null);
      db.control.findMany.mockResolvedValue([]);

      const result = await controller.getPolicyControls(
        'pol_999',
        orgId,
        mockAuthContext,
      );

      expect(result.mappedControls).toEqual([]);
    });

    it('scopes the requirementsMapped query to the caller organization', async () => {
      const { db } = require('@db');
      db.policy.findFirst.mockResolvedValue({ id: 'pol_1', controls: [] });
      db.control.findMany.mockResolvedValue([]);

      await controller.getPolicyControls('pol_1', orgId, mockAuthContext);

      expect(db.policy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pol_1', organizationId: orgId, archivedAt: null },
          select: expect.objectContaining({
            controls: expect.objectContaining({
              where: { archivedAt: null },
              select: expect.objectContaining({
                requirementsMapped: expect.objectContaining({
                  where: {
                    archivedAt: null,
                    frameworkInstance: { organizationId: orgId },
                  },
                }),
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('addPolicyControls', () => {
    it('should connect controls to policy and return success', async () => {
      const { db } = require('@db');
      db.policy.update.mockResolvedValue({});

      const result = await controller.addPolicyControls(
        'pol_1',
        { controlIds: ['ctrl_1', 'ctrl_2'] },
        orgId,
        mockAuthContext,
      );

      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: 'pol_1', organizationId: orgId },
        data: {
          controls: {
            connect: [{ id: 'ctrl_1' }, { id: 'ctrl_2' }],
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('removePolicyControl', () => {
    it('should disconnect control from policy and return success', async () => {
      const { db } = require('@db');
      db.policy.findUnique.mockResolvedValue({ controls: [] });
      db.policy.update.mockResolvedValue({});
      db.$transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          policy: {
            findUnique: db.policy.findUnique,
            update: db.policy.update,
          },
          frameworkControlPolicyLink: {
            deleteMany: db.frameworkControlPolicyLink.deleteMany,
          },
        }),
      );

      const result = await controller.removePolicyControl(
        'pol_1',
        'ctrl_1',
        orgId,
        mockAuthContext,
      );

      expect(db.policy.update).toHaveBeenCalledWith({
        where: { id: 'pol_1', organizationId: orgId },
        data: {
          controls: {
            disconnect: { id: 'ctrl_1' },
          },
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('getPolicyVersions', () => {
    it('should call policiesService.getVersions with correct params', async () => {
      const mockVersions = [{ id: 'ver_1', version: 1 }];
      mockPoliciesService.getVersions.mockResolvedValue(mockVersions);

      const result = await controller.getPolicyVersions(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.getVersions).toHaveBeenCalledWith('pol_1', orgId);
      expect(result).toEqual({
        data: mockVersions,
        authType: 'session',
        authenticatedUser: { id: 'usr_123', email: 'test@example.com' },
      });
    });
  });

  describe('getPolicyVersionById', () => {
    it('should call policiesService.getVersionById with correct params', async () => {
      const mockVersion = { id: 'ver_1', version: 1, content: [] };
      mockPoliciesService.getVersionById.mockResolvedValue(mockVersion);

      const result = await controller.getPolicyVersionById(
        'pol_1',
        'ver_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.getVersionById).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
      );
      expect(result.data).toEqual(mockVersion);
    });
  });

  describe('createPolicyVersion', () => {
    it('should call policiesService.createVersion with correct params', async () => {
      const body = { content: [{ type: 'paragraph' }] };
      const mockVersion = { id: 'ver_2', version: 2 };
      mockPoliciesService.createVersion.mockResolvedValue(mockVersion);

      const result = await controller.createPolicyVersion(
        'pol_1',
        body as never,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.createVersion).toHaveBeenCalledWith(
        'pol_1',
        orgId,
        body,
        'usr_123',
      );
      expect(result.data).toEqual(mockVersion);
    });
  });

  describe('updateVersionContent', () => {
    it('should call policiesService.updateVersionContent using req.body', async () => {
      const mockData = { id: 'ver_1', content: [{ type: 'paragraph' }] };
      mockPoliciesService.updateVersionContent.mockResolvedValue(mockData);
      const req = { body: { content: [{ type: 'paragraph' }] } };

      const result = await controller.updateVersionContent(
        'pol_1',
        'ver_1',
        req,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.updateVersionContent).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
        { content: [{ type: 'paragraph' }] },
      );
      expect(result.data).toEqual(mockData);
    });

    it('should default to empty array when content is not provided', async () => {
      mockPoliciesService.updateVersionContent.mockResolvedValue({});
      const req = { body: {} };

      await controller.updateVersionContent(
        'pol_1',
        'ver_1',
        req,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.updateVersionContent).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
        { content: [] },
      );
    });
  });

  describe('deletePolicyVersion', () => {
    it('should call policiesService.deleteVersion with correct params', async () => {
      const mockResult = { deleted: true };
      mockPoliciesService.deleteVersion.mockResolvedValue(mockResult);

      const result = await controller.deletePolicyVersion(
        'pol_1',
        'ver_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.deleteVersion).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('publishPolicyVersion', () => {
    it('should call policiesService.publishVersion with correct params', async () => {
      const body = { versionId: 'ver_1' };
      const mockResult = { published: true };
      mockPoliciesService.publishVersion.mockResolvedValue(mockResult);

      const result = await controller.publishPolicyVersion(
        'pol_1',
        body as never,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.publishVersion).toHaveBeenCalledWith(
        'pol_1',
        orgId,
        body,
        'usr_123',
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('setActivePolicyVersion', () => {
    it('should call policiesService.setActiveVersion with correct params', async () => {
      const mockResult = { activated: true };
      mockPoliciesService.setActiveVersion.mockResolvedValue(mockResult);

      const result = await controller.setActivePolicyVersion(
        'pol_1',
        'ver_1',
        orgId,
        mockAuthContext,
      );

      expect(policiesService.setActiveVersion).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('submitVersionForApproval', () => {
    it('should call policiesService.submitForApproval with correct params', async () => {
      const body = { approverId: 'mem_123' };
      const mockResult = { submitted: true };
      mockPoliciesService.submitForApproval.mockResolvedValue(mockResult);

      const result = await controller.submitVersionForApproval(
        'pol_1',
        'ver_1',
        body as never,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.submitForApproval).toHaveBeenCalledWith(
        'pol_1',
        'ver_1',
        orgId,
        body,
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('acceptPolicyChanges', () => {
    it('should call policiesService.acceptChanges with correct params', async () => {
      const body = { approverId: 'mem_123', comment: 'Looks good' };
      const mockResult = { accepted: true };
      mockPoliciesService.acceptChanges.mockResolvedValue(mockResult);

      const result = await controller.acceptPolicyChanges(
        'pol_1',
        body,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.acceptChanges).toHaveBeenCalledWith(
        'pol_1',
        orgId,
        body,
        'usr_123',
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('denyPolicyChanges', () => {
    it('should call policiesService.denyChanges with correct params', async () => {
      const body = { approverId: 'mem_123', comment: 'Needs revision' };
      const mockResult = { denied: true };
      mockPoliciesService.denyChanges.mockResolvedValue(mockResult);

      const result = await controller.denyPolicyChanges(
        'pol_1',
        body,
        orgId,
        mockAuthContext,
      );

      expect(policiesService.denyChanges).toHaveBeenCalledWith(
        'pol_1',
        orgId,
        body,
      );
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('getPolicyEvidenceTasks', () => {
    it('returns tasks grouped by control, excluding archived tasks', async () => {
      const { db } = require('@db');
      db.policy.findFirst.mockResolvedValue({
        id: 'pol_1',
        controls: [
          {
            id: 'ctl_1',
            name: 'Access Controls',
            tasks: [
              {
                id: 'tsk_1',
                title: 'Enable 2FA',
                status: 'in_progress',
                frequency: 'monthly',
                department: 'it',
                automationStatus: 'MANUAL',
                assigneeId: 'mem_1',
              },
            ],
          },
          {
            id: 'ctl_2',
            name: 'Monitoring',
            tasks: [],
          },
        ],
      });

      const result = await controller.getPolicyEvidenceTasks(
        'pol_1',
        orgId,
        mockAuthContext,
      );

      expect(db.policy.findFirst).toHaveBeenCalledWith({
        where: { id: 'pol_1', organizationId: orgId, archivedAt: null },
        select: expect.objectContaining({
          id: true,
          controls: expect.objectContaining({
            where: { archivedAt: null, organizationId: orgId },
            select: expect.objectContaining({
              tasks: expect.objectContaining({
                where: { archivedAt: null, organizationId: orgId },
              }),
            }),
          }),
        }),
      });
      expect(result.data).toEqual([
        {
          control: { id: 'ctl_1', name: 'Access Controls' },
          tasks: [
            {
              id: 'tsk_1',
              title: 'Enable 2FA',
              status: 'in_progress',
              frequency: 'monthly',
              department: 'it',
              automationStatus: 'MANUAL',
              assigneeId: 'mem_1',
            },
          ],
        },
        {
          control: { id: 'ctl_2', name: 'Monitoring' },
          tasks: [],
        },
      ]);
      expect(result.count).toBe(1);
      expect(result.authType).toBe('session');
    });

    it('throws NotFoundException when policy is not in caller org', async () => {
      const { db } = require('@db');
      db.policy.findFirst.mockResolvedValue(null);

      await expect(
        controller.getPolicyEvidenceTasks('pol_404', orgId, mockAuthContext),
      ).rejects.toThrow('Policy not found');
    });
  });
});
