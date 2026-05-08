import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RemediationController } from './remediation.controller';
import { RemediationService } from './remediation.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('./cloud-security-audit', () => ({
  logCloudSecurityActivity: jest.fn().mockResolvedValue(undefined),
}));

describe('RemediationController', () => {
  let controller: RemediationController;
  let service: jest.Mocked<RemediationService>;

  const mockService = {
    getCapabilities: jest.fn(),
    previewRemediation: jest.fn(),
    executeRemediation: jest.fn(),
    rollbackRemediation: jest.fn(),
    getActions: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const orgId = 'org_123';
  const userId = 'usr_456';
  const connectionId = 'conn_789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RemediationController],
      providers: [{ provide: RemediationService, useValue: mockService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<RemediationController>(RemediationController);
    service = module.get(RemediationService);

    jest.clearAllMocks();
  });

  describe('getCapabilities', () => {
    it('should call service with connectionId and organizationId', async () => {
      const capabilities = {
        enabled: true,
        remediations: [{ remediationKey: 's3-block-public-access' }],
      };
      mockService.getCapabilities.mockResolvedValue(capabilities);

      const result = await controller.getCapabilities(connectionId, orgId);

      expect(service.getCapabilities).toHaveBeenCalledWith({
        connectionId,
        organizationId: orgId,
      });
      expect(result).toEqual(capabilities);
    });

    it('should throw BAD_REQUEST when connectionId is missing', async () => {
      await expect(controller.getCapabilities('', orgId)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.getCapabilities('', orgId)).rejects.toMatchObject(
        {
          status: HttpStatus.BAD_REQUEST,
        },
      );

      expect(service.getCapabilities).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST when service throws', async () => {
      mockService.getCapabilities.mockRejectedValue(
        new Error('Connection not found'),
      );

      await expect(
        controller.getCapabilities(connectionId, orgId),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('preview', () => {
    const body = {
      connectionId,
      checkResultId: 'cr_001',
      remediationKey: 's3-block-public-access',
    };

    it('should call service with body params and organizationId', async () => {
      const preview = {
        description: 'Will block public access',
        risk: 'low',
        apiCalls: ['s3:PutPublicAccessBlock'],
      };
      mockService.previewRemediation.mockResolvedValue(preview);

      const result = await controller.preview(body, orgId);

      expect(service.previewRemediation).toHaveBeenCalledWith({
        connectionId: body.connectionId,
        organizationId: orgId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
      });
      expect(result).toEqual(preview);
    });

    it('should throw BAD_REQUEST when service throws', async () => {
      mockService.previewRemediation.mockRejectedValue(
        new Error('Finding not found'),
      );

      await expect(controller.preview(body, orgId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('execute', () => {
    const body = {
      connectionId,
      checkResultId: 'cr_001',
      remediationKey: 's3-block-public-access',
    };

    it('should call service with body params, organizationId, and userId', async () => {
      const result = {
        actionId: 'act_001',
        status: 'success' as const,
        resourceId: 'my-bucket',
        previousState: { publicAccess: true },
        appliedState: { publicAccess: false },
      };
      mockService.executeRemediation.mockResolvedValue(result);

      const response = await controller.execute(body, orgId, userId);

      expect(service.executeRemediation).toHaveBeenCalledWith({
        connectionId: body.connectionId,
        organizationId: orgId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
        userId,
      });
      expect(response).toEqual(result);
    });

    it('should pass acknowledgment to service', async () => {
      const bodyWithAck = {
        ...body,
        acknowledgment: 'acknowledged',
      };
      const result = {
        actionId: 'act_001',
        status: 'success' as const,
        resourceId: 'my-resource',
        previousState: { subscriptionState: 'INACTIVE' },
        appliedState: { subscriptionState: 'ACTIVE' },
      };
      mockService.executeRemediation.mockResolvedValue(result);

      const response = await controller.execute(bodyWithAck, orgId, userId);

      expect(service.executeRemediation).toHaveBeenCalledWith({
        connectionId: body.connectionId,
        organizationId: orgId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
        userId,
        acknowledgment: 'acknowledged',
      });
      expect(response).toEqual(result);
    });

    it('should pass type-to-confirm acknowledgment to service', async () => {
      const bodyWithTypeConfirm = {
        ...body,
        acknowledgment: 'enable shield advanced',
      };
      const result = {
        actionId: 'act_002',
        status: 'success' as const,
        resourceId: 'my-resource',
        previousState: { subscriptionState: 'INACTIVE' },
        appliedState: { subscriptionState: 'ACTIVE' },
      };
      mockService.executeRemediation.mockResolvedValue(result);

      const response = await controller.execute(
        bodyWithTypeConfirm,
        orgId,
        userId,
      );

      expect(service.executeRemediation).toHaveBeenCalledWith({
        connectionId: body.connectionId,
        organizationId: orgId,
        checkResultId: body.checkResultId,
        remediationKey: body.remediationKey,
        userId,
        acknowledgment: 'enable shield advanced',
      });
      expect(response).toEqual(result);
    });

    it('should throw BAD_REQUEST when service throws', async () => {
      mockService.executeRemediation.mockRejectedValue(
        new Error('No credentials found'),
      );

      await expect(controller.execute(body, orgId, userId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('rollback', () => {
    const actionId = 'act_001';

    it('should call service with actionId and organizationId', async () => {
      const rollbackResult = {
        status: 'rolled_back' as const,
        connectionId: 'conn_789',
        remediationKey: 's3-block-public-access',
        resourceId: 'my-bucket',
      };
      mockService.rollbackRemediation.mockResolvedValue(rollbackResult);

      const result = await controller.rollback(actionId, orgId, userId);

      expect(service.rollbackRemediation).toHaveBeenCalledWith({
        actionId,
        organizationId: orgId,
      });
      expect(result).toEqual({ status: 'rolled_back' });
    });

    it('should throw BAD_REQUEST when service throws', async () => {
      mockService.rollbackRemediation.mockRejectedValue(
        new Error('Remediation action not found'),
      );

      await expect(
        controller.rollback(actionId, orgId, userId),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getActions', () => {
    it('should return actions with count from service', async () => {
      const actions = [
        { id: 'act_001', status: 'success' },
        { id: 'act_002', status: 'failed' },
      ];
      mockService.getActions.mockResolvedValue(actions);

      const result = await controller.getActions(connectionId, orgId);

      expect(service.getActions).toHaveBeenCalledWith({
        connectionId,
        organizationId: orgId,
      });
      expect(result).toEqual({ data: actions, count: 2 });
    });

    it('should throw BAD_REQUEST when connectionId is missing', async () => {
      await expect(controller.getActions('', orgId)).rejects.toThrow(
        HttpException,
      );

      await expect(controller.getActions('', orgId)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });

      expect(service.getActions).not.toHaveBeenCalled();
    });

    it('should throw BAD_REQUEST when service throws', async () => {
      mockService.getActions.mockRejectedValue(
        new Error('Connection not found'),
      );

      await expect(controller.getActions(connectionId, orgId)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
