import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Readable } from 'stream';

const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

class MockGetObjectCommand {
  constructor(public readonly input: unknown) {
    Object.assign(this, input as object);
  }
}

class MockHeadObjectCommand {
  constructor(public readonly input: unknown) {
    Object.assign(this, input as object);
  }
}

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetObjectCommand: MockGetObjectCommand,
  HeadObjectCommand: MockHeadObjectCommand,
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
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

  describe('getUpdateFile', () => {
    it('streams .yml manifests directly from S3', async () => {
      const mockStream = new Readable({ read() {} });
      mockSend.mockResolvedValue({
        Body: mockStream,
        ContentLength: 859,
      });

      const result = await service.getUpdateFile({ filename: 'latest-mac.yml' });

      expect(result).toEqual({
        kind: 'stream',
        stream: mockStream,
        contentType: 'text/yaml',
        contentLength: 859,
      });
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it('redirects binary downloads to a presigned S3 URL signed for GET', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-zip-url');

      const result = await service.getUpdateFile({
        filename: 'CompAI-Device-Agent-1.0.5-arm64.zip',
      });

      expect(result).toEqual({
        kind: 'redirect',
        url: 'https://s3.example.com/signed-zip-url',
      });
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      const [, command] = mockGetSignedUrl.mock.calls[0];
      expect(command).toBeInstanceOf(MockGetObjectCommand);
      expect(command).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'device-agent/production/updates/CompAI-Device-Agent-1.0.5-arm64.zip',
      });
    });

    it.each([
      'CompAI-Device-Agent-1.0.5-arm64.zip',
      'CompAI-Device-Agent-1.0.5-setup.exe',
      'CompAI-Device-Agent-1.0.5-arm64.dmg',
      'CompAI-Device-Agent-1.0.5-x86_64.AppImage',
      'CompAI-Device-Agent-1.0.5-arm64.zip.blockmap',
    ])('redirects binary file %s', async (filename) => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed');

      const result = await service.getUpdateFile({ filename });

      expect(result).toEqual({
        kind: 'redirect',
        url: 'https://s3.example.com/signed',
      });
    });

    it('throws NotFoundException for invalid filenames', async () => {
      await expect(
        service.getUpdateFile({ filename: '../etc/passwd' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getUpdateFile({ filename: 'foo.txt' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when S3 returns NoSuchKey for a yml manifest', async () => {
      const error = new Error('Not found');
      error.name = 'NoSuchKey';
      mockSend.mockRejectedValue(error);

      await expect(
        service.getUpdateFile({ filename: 'latest-mac.yml' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('headUpdateFile', () => {
    it('returns metadata for .yml manifests', async () => {
      mockSend.mockResolvedValue({ ContentLength: 859 });

      const result = await service.headUpdateFile({
        filename: 'latest-mac.yml',
      });

      expect(result).toEqual({
        kind: 'stream',
        contentType: 'text/yaml',
        contentLength: 859,
      });
      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it('redirects binary HEAD requests to a URL signed with HeadObjectCommand', async () => {
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-head');

      const result = await service.headUpdateFile({
        filename: 'CompAI-Device-Agent-1.0.5-arm64.zip',
      });

      expect(result).toEqual({
        kind: 'redirect',
        url: 'https://s3.example.com/signed-head',
      });
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
      const [, command] = mockGetSignedUrl.mock.calls[0];
      // S3 signs each HTTP method separately; a GET-signed URL would be
      // rejected when used with a HEAD request.
      expect(command).toBeInstanceOf(MockHeadObjectCommand);
      expect(command).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'device-agent/production/updates/CompAI-Device-Agent-1.0.5-arm64.zip',
      });
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
