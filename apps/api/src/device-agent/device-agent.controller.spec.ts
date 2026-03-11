import { Test, TestingModule } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { DeviceAgentController } from './device-agent.controller';
import { DeviceAgentAuthService } from './device-agent-auth.service';
import { DeviceAgentService } from './device-agent.service';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import { Readable } from 'stream';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {
    app: ['create', 'read', 'update', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('DeviceAgentController', () => {
  let controller: DeviceAgentController;
  let service: jest.Mocked<DeviceAgentService>;

  const mockService = {
    downloadMacAgent: jest.fn(),
    downloadWindowsAgent: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const mockAuthContext: AuthContextType = {
    organizationId: 'org_1',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'user_1',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
  };

  const mockRes = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceAgentController],
      providers: [
        { provide: DeviceAgentService, useValue: mockService },
        { provide: DeviceAgentAuthService, useValue: {} },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<DeviceAgentController>(DeviceAgentController);
    service = module.get(DeviceAgentService);

    jest.clearAllMocks();
  });

  describe('downloadMacAgent', () => {
    it('should call service.downloadMacAgent and return StreamableFile', async () => {
      const mockStream = Readable.from(Buffer.from('binary-content'));
      mockService.downloadMacAgent.mockResolvedValue({
        stream: mockStream,
        filename: 'comp-agent-mac.pkg',
        contentType: 'application/octet-stream',
      });

      const result = await controller.downloadMacAgent(
        'org_1',
        mockAuthContext,
        mockRes as never,
      );

      expect(service.downloadMacAgent).toHaveBeenCalled();
      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        }),
      );
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining('comp-agent-mac.pkg'),
        }),
      );
    });

    it('should propagate errors from service', async () => {
      mockService.downloadMacAgent.mockRejectedValue(
        new Error('Agent not found'),
      );

      await expect(
        controller.downloadMacAgent('org_1', mockAuthContext, mockRes as never),
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('downloadWindowsAgent', () => {
    it('should call service.downloadWindowsAgent and return StreamableFile', async () => {
      const mockStream = Readable.from(Buffer.from('binary-content'));
      mockService.downloadWindowsAgent.mockResolvedValue({
        stream: mockStream,
        filename: 'comp-agent-windows.exe',
        contentType: 'application/octet-stream',
      });

      const result = await controller.downloadWindowsAgent(
        'org_1',
        mockAuthContext,
        mockRes as never,
      );

      expect(service.downloadWindowsAgent).toHaveBeenCalled();
      expect(result).toBeInstanceOf(StreamableFile);
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        }),
      );
      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Disposition': expect.stringContaining(
            'comp-agent-windows.exe',
          ),
        }),
      );
    });

    it('should propagate errors from service', async () => {
      mockService.downloadWindowsAgent.mockRejectedValue(
        new Error('Agent not found'),
      );

      await expect(
        controller.downloadWindowsAgent(
          'org_1',
          mockAuthContext,
          mockRes as never,
        ),
      ).rejects.toThrow('Agent not found');
    });
  });
});
