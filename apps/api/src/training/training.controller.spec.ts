import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard, PERMISSIONS_KEY } from '../auth/permission.guard';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@comp/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('TrainingController', () => {
  let controller: TrainingController;
  let trainingService: jest.Mocked<TrainingService>;

  const mockTrainingService = {
    sendTrainingCompletionEmailIfComplete: jest.fn(),
    generateCertificate: jest.fn(),
    getCompletions: jest.fn(),
    markVideoComplete: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [
        { provide: TrainingService, useValue: mockTrainingService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TrainingController>(TrainingController);
    trainingService = module.get(TrainingService);

    jest.clearAllMocks();
  });

  describe('sendTrainingCompletionEmail', () => {
    const dto = { memberId: 'mem_123' };

    it('should call trainingService.sendTrainingCompletionEmailIfComplete with correct params', async () => {
      const serviceResult = { sent: true, message: 'Email sent' };
      mockTrainingService.sendTrainingCompletionEmailIfComplete.mockResolvedValue(
        serviceResult,
      );

      const result = await controller.sendTrainingCompletionEmail(
        'org_123',
        dto as never,
      );

      expect(
        trainingService.sendTrainingCompletionEmailIfComplete,
      ).toHaveBeenCalledWith('mem_123', 'org_123');
      expect(result).toEqual(serviceResult);
    });
  });

  describe('generateCertificate', () => {
    const dto = { memberId: 'mem_123' };

    const mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    it('should set PDF headers and send buffer on success', async () => {
      const pdfBuffer = Buffer.from('pdf-content');
      mockTrainingService.generateCertificate.mockResolvedValue({
        pdf: pdfBuffer,
        fileName: 'certificate.pdf',
      });

      await controller.generateCertificate(
        'org_123',
        dto as never,
        mockResponse as never,
      );

      expect(trainingService.generateCertificate).toHaveBeenCalledWith(
        'mem_123',
        'org_123',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="certificate.pdf"',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(pdfBuffer);
    });

    it('should throw BadRequestException when result contains error', async () => {
      mockTrainingService.generateCertificate.mockResolvedValue({
        error: 'Training not complete',
      });

      await expect(
        controller.generateCertificate(
          'org_123',
          dto as never,
          mockResponse as never,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCompletions', () => {
    it('should return completions when memberId is provided', async () => {
      const mockCompletions = [
        { id: 'comp_1', videoId: 'vid_1', completedAt: new Date() },
      ];
      mockTrainingService.getCompletions.mockResolvedValue(mockCompletions);

      const result = await controller.getCompletions('mem_123', 'org_123');

      expect(trainingService.getCompletions).toHaveBeenCalledWith(
        'mem_123',
        'org_123',
      );
      expect(result).toEqual(mockCompletions);
    });

    it('should throw BadRequestException when memberId is undefined', async () => {
      await expect(
        controller.getCompletions(undefined as unknown as string, 'org_123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markVideoComplete', () => {
    it('should mark video complete and return record', async () => {
      const mockRecord = {
        id: 'comp_1',
        videoId: 'vid_abc',
        completedAt: new Date(),
      };
      mockTrainingService.markVideoComplete.mockResolvedValue(mockRecord);

      const result = await controller.markVideoComplete(
        'mem_123',
        'org_123',
        'vid_abc',
      );

      expect(trainingService.markVideoComplete).toHaveBeenCalledWith(
        'mem_123',
        'org_123',
        'vid_abc',
      );
      expect(result).toEqual(mockRecord);
    });

    it('should throw BadRequestException when memberId is undefined', async () => {
      await expect(
        controller.markVideoComplete(
          undefined as unknown as string,
          'org_123',
          'vid_abc',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('RBAC - permission decorators', () => {
    it('getCompletions should require portal:read', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        controller.getCompletions,
      );
      expect(permissions).toEqual([
        { resource: 'portal', actions: ['read'] },
      ]);
    });

    it('markVideoComplete should require portal:update', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        controller.markVideoComplete,
      );
      expect(permissions).toEqual([
        { resource: 'portal', actions: ['update'] },
      ]);
    });

    it('sendTrainingCompletionEmail should require training:update', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        controller.sendTrainingCompletionEmail,
      );
      expect(permissions).toEqual([
        { resource: 'training', actions: ['update'] },
      ]);
    });

    it('generateCertificate should require training:read', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        controller.generateCertificate,
      );
      expect(permissions).toEqual([
        { resource: 'training', actions: ['read'] },
      ]);
    });
  });
});
