import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Readable } from 'stream';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetObjectCommand: jest.fn().mockImplementation((input) => input),
}));

import { DeviceAgentService } from './device-agent.service';

describe('DeviceAgentService', () => {
  let service: DeviceAgentService;

  beforeAll(() => {
    process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
    process.env.APP_AWS_REGION = 'us-east-1';
    process.env.APP_AWS_ACCESS_KEY_ID = 'test-key';
    process.env.APP_AWS_SECRET_ACCESS_KEY = 'test-secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeviceAgentService();
  });

  describe('downloadMacAgent', () => {
    it('should return stream, filename, and contentType on success', async () => {
      const mockStream = new Readable({ read() {} });
      mockSend.mockResolvedValue({ Body: mockStream });

      const result = await service.downloadMacAgent();

      expect(result.stream).toBe(mockStream);
      expect(result.filename).toBe('Comp AI Agent-1.0.0-arm64.dmg');
      expect(result.contentType).toBe('application/x-apple-diskimage');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'macos/Comp AI Agent-1.0.0-arm64.dmg',
        }),
      );
    });

    it('should throw NotFoundException when S3 returns no body', async () => {
      mockSend.mockResolvedValue({ Body: undefined });

      await expect(service.downloadMacAgent()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.downloadMacAgent()).rejects.toThrow(
        'macOS agent DMG file not found in S3',
      );
    });

    it('should throw NotFoundException when S3 throws NoSuchKey', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValue(error);

      await expect(service.downloadMacAgent()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.downloadMacAgent()).rejects.toThrow(
        'macOS agent file not found',
      );
    });

    it('should throw NotFoundException when S3 throws NotFound', async () => {
      const error = new Error('Not found');
      error.name = 'NotFound';
      mockSend.mockRejectedValue(error);

      await expect(service.downloadMacAgent()).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on other S3 errors', async () => {
      mockSend.mockRejectedValue(new Error('Network failure'));

      await expect(service.downloadMacAgent()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.downloadMacAgent()).rejects.toThrow(
        'Failed to download macOS agent',
      );
    });
  });

  describe('downloadWindowsAgent', () => {
    it('should return stream, filename, and contentType on success', async () => {
      const mockStream = new Readable({ read() {} });
      mockSend.mockResolvedValue({ Body: mockStream });

      const result = await service.downloadWindowsAgent();

      expect(result.stream).toBe(mockStream);
      expect(result.filename).toBe('Comp AI Agent 1.0.0.exe');
      expect(result.contentType).toBe('application/octet-stream');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'windows/Comp AI Agent 1.0.0.exe',
        }),
      );
    });

    it('should throw NotFoundException when S3 returns no body', async () => {
      mockSend.mockResolvedValue({ Body: undefined });

      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        'Windows agent executable file not found in S3',
      );
    });

    it('should throw NotFoundException when S3 throws NoSuchKey', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValue(error);

      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        'Windows agent file not found',
      );
    });

    it('should throw NotFoundException when S3 throws NotFound', async () => {
      const error = new Error('Not found');
      error.name = 'NotFound';
      mockSend.mockRejectedValue(error);

      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on other S3 errors', async () => {
      mockSend.mockRejectedValue(new Error('Network failure'));

      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.downloadWindowsAgent()).rejects.toThrow(
        'Failed to download Windows agent',
      );
    });
  });
});
