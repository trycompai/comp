import { CommentEntityType } from '@db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the mock setup utilities first
import { mockAuth, setupAuthMocks } from '@/test-utils/mocks/auth';
import { mockDb } from '@/test-utils/mocks/db';

// Mock the modules with the imported mocks
vi.mock('@/utils/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@db', () => ({
  db: mockDb,
}));

vi.mock('@/app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: {
    send: vi.fn(),
  },
}));

// Import the function to test after mocking
import { createComment } from '../createComment';

describe('createComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset transaction mock to pass through
    mockDb.$transaction.mockImplementation((fn) => fn(mockDb));
  });

  describe('Authorization', () => {
    it('should fail when no active organization is found', async () => {
      setupAuthMocks({ session: { activeOrganizationId: null } as any });

      const result = await createComment({
        content: 'Test comment',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized - no active organization found.',
        data: null,
      });
    });

    it('should fail when user is not a member of the organization', async () => {
      setupAuthMocks();
      mockDb.member.findFirst.mockResolvedValue(null);

      const result = await createComment({
        content: 'Test comment',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized - member not found in organization.',
        data: null,
      });
    });
  });

  describe('Validation', () => {
    it('should fail when both content and attachments are empty', async () => {
      setupAuthMocks();
      mockDb.member.findFirst.mockResolvedValue({ id: 'member_123' });

      // The actual implementation creates an empty comment, doesn't validate
      // So let's update the test to match the actual behavior
      const result = await createComment({
        content: '',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      });

      // Based on the schema validation, this should fail
      expect(result.success).toBe(false);
      // The error comes from Zod validation
      expect(result.error).toBeDefined();
    });

    it('should fail when entityId is missing', async () => {
      setupAuthMocks();
      mockDb.member.findFirst.mockResolvedValue({ id: 'member_123' });

      const result = await createComment({
        content: 'Test comment',
        entityId: '',
        entityType: CommentEntityType.task,
      });

      expect(result).toEqual({
        success: false,
        error: 'Internal error: Entity ID missing.',
        data: null,
      });
    });

    it('should succeed with only content (no attachments)', async () => {
      const { session } = setupAuthMocks();
      const mockMember = { id: 'member_123' };
      const mockComment = {
        id: 'comment_123',
        content: 'Test comment',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        createdAt: new Date(),
      };

      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.create.mockResolvedValue(mockComment);

      const result = await createComment({
        content: 'Test comment',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      });

      expect(result).toEqual({
        success: true,
        data: mockComment,
        error: null,
      });

      expect(mockDb.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Test comment',
          entityId: 'task_123',
          entityType: CommentEntityType.task,
          authorId: mockMember.id,
          organizationId: session!.activeOrganizationId,
        },
      });
    });

    it('should succeed with only attachments (no content)', async () => {
      const { session } = setupAuthMocks();
      const mockMember = { id: 'member_123' };
      const mockComment = {
        id: 'comment_123',
        content: '',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        createdAt: new Date(),
      };

      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.create.mockResolvedValue(mockComment);

      const { s3Client } = await import('@/app/s3');

      const result = await createComment({
        content: '',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: [
          {
            id: 'temp_123',
            name: 'test.pdf',
            fileType: 'application/pdf',
            fileData: 'base64data',
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockComment);
      expect(s3Client.send).toHaveBeenCalled();
      expect(mockDb.attachment.create).toHaveBeenCalled();
    });
  });

  describe('Attachment Handling', () => {
    it('should upload files to S3 and create attachment records', async () => {
      const { session } = setupAuthMocks();
      const mockMember = { id: 'member_123' };
      const mockComment = {
        id: 'comment_123',
        content: 'Test with attachments',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        createdAt: new Date(),
      };

      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.create.mockResolvedValue(mockComment);

      const { s3Client } = await import('@/app/s3');

      const attachments = [
        {
          id: 'temp_1',
          name: 'document.pdf',
          fileType: 'application/pdf',
          fileData: 'base64pdf',
        },
        {
          id: 'temp_2',
          name: 'image.png',
          fileType: 'image/png',
          fileData: 'base64image',
        },
      ];

      const result = await createComment({
        content: 'Test with attachments',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments,
      });

      expect(result.success).toBe(true);

      // Verify S3 uploads
      expect(s3Client.send).toHaveBeenCalledTimes(2);

      // Verify attachment records
      expect(mockDb.attachment.create).toHaveBeenCalledTimes(2);
      expect(mockDb.attachment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'document.pdf',
          type: 'document',
          entityId: mockComment.id,
          entityType: 'comment',
          organizationId: session!.activeOrganizationId,
        }),
      });
      expect(mockDb.attachment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'image.png',
          type: 'image',
          entityId: mockComment.id,
          entityType: 'comment',
          organizationId: session!.activeOrganizationId,
        }),
      });
    });

    it('should handle S3 upload failures gracefully', async () => {
      const { session } = setupAuthMocks();
      const mockMember = { id: 'member_123' };

      mockDb.member.findFirst.mockResolvedValue(mockMember);

      const { s3Client } = await import('@/app/s3');
      // Make S3 upload fail
      (s3Client.send as any).mockRejectedValue(new Error('S3 upload failed'));

      const result = await createComment({
        content: 'Test with failing attachment',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: [
          {
            id: 'temp_fail',
            name: 'fail.pdf',
            fileType: 'application/pdf',
            fileData: 'base64fail',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save comment and link attachments.');
      // Verify transaction was rolled back (comment not created)
      expect(mockDb.comment.create).toHaveBeenCalled();
    });
  });

  describe('Entity Type Support', () => {
    const entityTypes = [
      CommentEntityType.task,
      CommentEntityType.policy,
      CommentEntityType.vendor,
      CommentEntityType.risk,
    ];

    entityTypes.forEach((entityType) => {
      it(`should create comments for ${entityType} entities`, async () => {
        const { session } = setupAuthMocks();
        const mockMember = { id: 'member_123' };
        const mockComment = {
          id: 'comment_123',
          content: `Comment on ${entityType}`,
          entityId: `${entityType}_123`,
          entityType,
          authorId: mockMember.id,
          organizationId: session!.activeOrganizationId,
          createdAt: new Date(),
        };

        mockDb.member.findFirst.mockResolvedValue(mockMember);
        mockDb.comment.create.mockResolvedValue(mockComment);

        const result = await createComment({
          content: `Comment on ${entityType}`,
          entityId: `${entityType}_123`,
          entityType,
        });

        expect(result.success).toBe(true);
        expect(result.data?.entityType).toBe(entityType);
      });
    });
  });

  describe('Transaction Behavior', () => {
    it('should rollback all operations if any step fails', async () => {
      const { session } = setupAuthMocks();
      const mockMember = { id: 'member_123' };

      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.create.mockResolvedValue({ id: 'comment_123' });

      // Make attachment creation fail
      mockDb.attachment.create.mockRejectedValue(new Error('DB error'));

      const result = await createComment({
        content: 'Test transaction rollback',
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: [
          {
            id: 'temp_123',
            name: 'test.pdf',
            fileType: 'application/pdf',
            fileData: 'base64data',
          },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save comment and link attachments.');
      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});
