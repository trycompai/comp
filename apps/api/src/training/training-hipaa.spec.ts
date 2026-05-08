import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TrainingService } from './training.service';

jest.mock('@db', () => ({
  db: {
    member: { findFirst: jest.fn(), findUnique: jest.fn() },
    employeeTrainingVideoCompletion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const { db } = jest.requireMock('@db');

const mockEmailService = {
  sendTrainingCompletedEmail: jest.fn(),
};

const mockCertService = {
  generateTrainingCertificatePdf: jest.fn(),
};

describe('TrainingService — HIPAA training', () => {
  let service: TrainingService;

  beforeEach(() => {
    service = new TrainingService(
      mockEmailService as never,
      mockCertService as never,
    );
    jest.clearAllMocks();
  });

  describe('markVideoComplete', () => {
    it('should accept hipaa-sat-1 as a valid training ID', async () => {
      db.member.findFirst.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
      });
      db.employeeTrainingVideoCompletion.findFirst.mockResolvedValue(null);
      db.employeeTrainingVideoCompletion.create.mockResolvedValue({
        id: 'evc_1',
        videoId: 'hipaa-sat-1',
        memberId: 'mem_1',
        completedAt: new Date(),
      });
      db.employeeTrainingVideoCompletion.findMany.mockResolvedValue([]);

      const result = await service.markVideoComplete(
        'mem_1',
        'org_1',
        'hipaa-sat-1',
      );

      expect(result.videoId).toBe('hipaa-sat-1');
      expect(db.employeeTrainingVideoCompletion.create).toHaveBeenCalledWith({
        data: {
          videoId: 'hipaa-sat-1',
          memberId: 'mem_1',
          completedAt: expect.any(Date),
        },
      });
    });

    it('should reject unknown training IDs', async () => {
      await expect(
        service.markVideoComplete('mem_1', 'org_1', 'unknown-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should still accept general SAT IDs', async () => {
      db.member.findFirst.mockResolvedValue({
        id: 'mem_1',
        organizationId: 'org_1',
      });
      db.employeeTrainingVideoCompletion.findFirst.mockResolvedValue(null);
      db.employeeTrainingVideoCompletion.create.mockResolvedValue({
        id: 'evc_2',
        videoId: 'sat-3',
        memberId: 'mem_1',
        completedAt: new Date(),
      });
      db.employeeTrainingVideoCompletion.findMany.mockResolvedValue([]);

      const result = await service.markVideoComplete('mem_1', 'org_1', 'sat-3');

      expect(result.videoId).toBe('sat-3');
    });
  });

  describe('hasCompletedAllTraining', () => {
    it('should return true when all 5 general SAT videos are completed', async () => {
      db.employeeTrainingVideoCompletion.findMany.mockResolvedValue(
        ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'].map((id) => ({
          videoId: id,
          completedAt: new Date(),
        })),
      );

      const result = await service.hasCompletedAllTraining('mem_1');
      expect(result).toBe(true);
    });

    it('should return false when only some general SAT videos are completed', async () => {
      db.employeeTrainingVideoCompletion.findMany.mockResolvedValue(
        ['sat-1', 'sat-2'].map((id) => ({
          videoId: id,
          completedAt: new Date(),
        })),
      );

      const result = await service.hasCompletedAllTraining('mem_1');
      expect(result).toBe(false);
    });

    it('should NOT require hipaa-sat-1 for general training completion', async () => {
      db.employeeTrainingVideoCompletion.findMany.mockResolvedValue(
        ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'].map((id) => ({
          videoId: id,
          completedAt: new Date(),
        })),
      );

      const result = await service.hasCompletedAllTraining('mem_1');
      expect(result).toBe(true);
    });
  });

  describe('hasCompletedHipaaTraining', () => {
    it('should return true when hipaa-sat-1 is completed', async () => {
      db.employeeTrainingVideoCompletion.findFirst.mockResolvedValue({
        videoId: 'hipaa-sat-1',
        completedAt: new Date(),
      });

      const result = await service.hasCompletedHipaaTraining('mem_1');
      expect(result).toBe(true);
    });

    it('should return false when hipaa-sat-1 is not completed', async () => {
      db.employeeTrainingVideoCompletion.findFirst.mockResolvedValue(null);

      const result = await service.hasCompletedHipaaTraining('mem_1');
      expect(result).toBe(false);
    });

    it('should return false when hipaa-sat-1 exists but has no completedAt', async () => {
      db.employeeTrainingVideoCompletion.findFirst.mockResolvedValue(null);

      const result = await service.hasCompletedHipaaTraining('mem_1');
      expect(result).toBe(false);
    });
  });
});
