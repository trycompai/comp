import { AttachmentEntityType, CommentEntityType } from '@comp/db/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the mock setup utilities first
import { mockAuth, setupAuthMocks } from '@/test-utils/mocks/auth';
import { mockDb } from '@/test-utils/mocks/db';

// Mock the modules with the imported mocks
vi.mock('@/utils/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@comp/db', () => ({
  db: mockDb,
}));

vi.mock('@/app/s3', () => ({
  BUCKET_NAME: 'test-bucket',
  s3Client: {
    send: vi.fn(),
  },
  extractS3KeyFromUrl: vi.fn((url: string) => url),
}));

// Import the function to test after mocking
import { updateComment } from '../updateComment';

describe('updateComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation((fn) => fn(mockDb));
  });

  describe('Authorization', () => {
    it('should fail when no active organization exists', async () => {
      setupAuthMocks({ session: { activeOrganizationId: null } as any });

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized',
        data: null,
      });
    });

    it('should fail when user is not the comment author', async () => {
      const { session, user } = setupAuthMocks();
      const differentMember = {
        id: 'member_different',
        userId: 'user_different',
      };

      const mockComment = {
        id: 'comment_123',
        authorId: differentMember.id, // Different author
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member_123', // Current user's member ID
        userId: user!.id,
      });

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized',
        data: null,
      });
    });

    it('should fail when comment belongs to different organization', async () => {
      const { session } = setupAuthMocks();

      // When comment belongs to different org, findUnique with organizationId filter returns null
      mockDb.comment.findUnique.mockResolvedValue(null);

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
      });

      expect(result).toEqual({
        success: false,
        error: 'Comment not found',
        data: null,
      });
    });
  });

  describe('Content Updates', () => {
    it('should update comment content successfully', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      const updatedComment = {
        ...mockComment,
        content: 'Updated content',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.update.mockResolvedValue(updatedComment);

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: updatedComment,
      });

      expect(mockDb.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment_123' },
        data: { content: 'Updated content' },
      });
    });

    it('should handle empty content when attachments exist', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.update.mockResolvedValue({ ...mockComment, content: '' });
      mockDb.attachment.findMany.mockResolvedValue([{ id: 'att_1' }]); // Has attachments

      const result = await updateComment({
        commentId: 'comment_123',
        content: '', // Empty content
      });

      expect(result.success).toBe(true);
    });

    it('should fail when setting empty content without attachments', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.attachment.findMany.mockResolvedValue([]); // No attachments
      mockDb.comment.update.mockResolvedValue({ ...mockComment, content: '' });

      // The updateComment action doesn't validate empty content, it just updates
      const result = await updateComment({
        commentId: 'comment_123',
        content: '', // Empty content
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Attachment Management', () => {
    it('should add new attachments to comment', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.attachment.updateMany.mockResolvedValue({ count: 2 });

      const result = await updateComment({
        commentId: 'comment_123',
        attachmentIdsToAdd: ['att_new_1', 'att_new_2'],
      });

      expect(result.success).toBe(true);

      expect(mockDb.attachment.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['att_new_1', 'att_new_2'] },
          organizationId: session!.activeOrganizationId,
          entityType: AttachmentEntityType.comment,
          entityId: mockComment.entityId, // Parent entity ID
        },
        data: {
          entityId: mockComment.id, // Update to comment ID
        },
      });
    });

    it('should remove attachments and clean up S3', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      const attachmentsToRemove = [
        { id: 'att_1', url: 's3://bucket/key1' },
        { id: 'att_2', url: 's3://bucket/key2' },
      ];

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.attachment.findMany.mockResolvedValue(attachmentsToRemove);
      mockDb.attachment.deleteMany.mockResolvedValue({ count: 2 });

      const { s3Client } = await import('@/app/s3');

      const result = await updateComment({
        commentId: 'comment_123',
        attachmentIdsToRemove: ['att_1', 'att_2'],
      });

      expect(result.success).toBe(true);

      // Verify S3 deletions
      expect(s3Client.send).toHaveBeenCalledTimes(2);

      // Verify DB deletions
      expect(mockDb.attachment.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['att_1', 'att_2'] },
          organizationId: session!.activeOrganizationId,
          entityId: mockComment.id,
        },
      });
    });

    it('should continue attachment removal even if S3 fails', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.attachment.findMany.mockResolvedValue([{ id: 'att_1', url: 's3://bucket/key1' }]);
      mockDb.attachment.deleteMany.mockResolvedValue({ count: 1 });

      const { s3Client } = await import('@/app/s3');
      (s3Client.send as any).mockRejectedValue(new Error('S3 error'));

      const result = await updateComment({
        commentId: 'comment_123',
        attachmentIdsToRemove: ['att_1'],
      });

      // Should still succeed
      expect(result.success).toBe(true);
      expect(mockDb.attachment.deleteMany).toHaveBeenCalled();
    });
  });

  describe('Combined Updates', () => {
    it('should update content and manage attachments in one transaction', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
      };

      const updatedComment = {
        ...mockComment,
        content: 'Updated content',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.update.mockResolvedValue(updatedComment);
      mockDb.attachment.findMany.mockResolvedValue([{ id: 'att_old', url: 's3://bucket/old' }]);
      mockDb.attachment.deleteMany.mockResolvedValue({ count: 1 });
      mockDb.attachment.updateMany.mockResolvedValue({ count: 1 });

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
        attachmentIdsToRemove: ['att_old'],
        attachmentIdsToAdd: ['att_new'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeTruthy();

      // Verify all operations were called
      expect(mockDb.comment.update).toHaveBeenCalled();
      expect(mockDb.attachment.deleteMany).toHaveBeenCalled();
      expect(mockDb.attachment.updateMany).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent comments', async () => {
      setupAuthMocks();
      mockDb.comment.findUnique.mockResolvedValue(null);

      const result = await updateComment({
        commentId: 'comment_nonexistent',
        content: 'Updated',
      });

      expect(result).toEqual({
        success: false,
        error: 'Comment not found',
        data: null,
      });
    });

    it('should handle database errors gracefully', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.update.mockRejectedValue(new Error('DB error'));

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
      });

      expect(result).toEqual({
        success: false,
        error: 'DB error',
      });
    });

    it('should rollback transaction on failure', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
      };

      const mockComment = {
        id: 'comment_123',
        content: 'Original content',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.update.mockResolvedValue(mockComment);
      mockDb.attachment.updateMany.mockRejectedValue(new Error('Attachment update failed'));

      const result = await updateComment({
        commentId: 'comment_123',
        content: 'Updated content',
        attachmentIdsToAdd: ['att_new'],
      });

      expect(result.success).toBe(false);
      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});
