import { AttachmentEntityType, CommentEntityType } from '@db';
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
  extractS3KeyFromUrl: vi.fn((url: string) => url),
}));

// Import the function to test after mocking
import { deleteComment } from '../deleteComment';

describe('deleteComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.$transaction.mockImplementation((fn) => fn(mockDb));
  });

  describe('Authorization', () => {
    it('should fail when no session exists', async () => {
      setupAuthMocks({ session: null, user: null });

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized: No active organization',
      });
    });

    it('should fail when no active organization exists', async () => {
      setupAuthMocks({ session: { activeOrganizationId: null } as any });

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized: No active organization',
      });
    });

    it('should fail when user is not the comment author', async () => {
      const { session, user } = setupAuthMocks();
      const differentMember = {
        id: 'member_different',
        userId: 'user_different',
        organizationId: session!.activeOrganizationId,
      };

      const mockComment = {
        id: 'comment_123',
        authorId: differentMember.id, // Different member
        organizationId: session!.activeOrganizationId,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue({
        id: 'member_123', // Current user's member ID
        userId: user!.id,
      });

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized to delete this comment',
      });
    });

    it('should fail when comment belongs to different organization', async () => {
      const { session } = setupAuthMocks();

      // When querying with organizationId filter, comment from different org returns null
      mockDb.comment.findUnique.mockResolvedValue(null);

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Comment not found or access denied',
      });
    });
  });

  describe('Successful Deletion', () => {
    it('should delete comment without attachments', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
        organizationId: session!.activeOrganizationId,
      };

      const mockComment = {
        id: 'comment_123',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: [], // No attachments
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.delete.mockResolvedValue(mockComment);

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: true,
        data: { deletedCommentId: 'comment_123' },
      });

      expect(mockDb.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment_123', organizationId: session!.activeOrganizationId },
      });
    });

    it('should delete comment with attachments and clean up S3', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
        organizationId: session!.activeOrganizationId,
      };

      const mockAttachments = [
        {
          id: 'att_1',
          url: 's3://bucket/key1',
          entityType: AttachmentEntityType.comment,
        },
        {
          id: 'att_2',
          url: 's3://bucket/key2',
          entityType: AttachmentEntityType.comment,
        },
      ];

      const mockComment = {
        id: 'comment_123',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: mockAttachments,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.delete.mockResolvedValue(mockComment);
      mockDb.attachment.deleteMany.mockResolvedValue({ count: 2 });

      const { s3Client } = await import('@/app/s3');

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: true,
        data: { deletedCommentId: 'comment_123' },
      });

      // Verify S3 deletions
      expect(s3Client.send).toHaveBeenCalledTimes(2);

      // Verify DB deletions
      expect(mockDb.attachment.deleteMany).toHaveBeenCalledWith({
        where: {
          entityId: 'comment_123',
          organizationId: session!.activeOrganizationId,
        },
      });

      expect(mockDb.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment_123', organizationId: session!.activeOrganizationId },
      });
    });

    it('should continue deletion even if S3 cleanup fails', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
        organizationId: session!.activeOrganizationId,
      };

      const mockAttachments = [
        {
          id: 'att_1',
          url: 's3://bucket/key1',
          entityType: AttachmentEntityType.comment,
        },
      ];

      const mockComment = {
        id: 'comment_123',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        entityId: 'task_123',
        entityType: CommentEntityType.task,
        attachments: mockAttachments,
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.delete.mockResolvedValue(mockComment);
      mockDb.attachment.deleteMany.mockResolvedValue({ count: 1 });

      const { s3Client } = await import('@/app/s3');
      // Make S3 deletion fail
      (s3Client.send as any).mockRejectedValue(new Error('S3 error'));

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      // Should still succeed even if S3 fails
      expect(result).toEqual({
        success: true,
        data: { deletedCommentId: 'comment_123' },
      });

      expect(mockDb.comment.delete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const { session, user } = setupAuthMocks();
      const mockMember = {
        id: 'member_123',
        userId: user!.id,
        organizationId: session!.activeOrganizationId,
      };

      const mockComment = {
        id: 'comment_123',
        authorId: mockMember.id,
        organizationId: session!.activeOrganizationId,
        attachments: [],
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(mockMember);
      mockDb.comment.delete.mockRejectedValue(new Error('DB error'));

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'DB error',
      });
    });

    it('should handle non-existent comments', async () => {
      setupAuthMocks();
      mockDb.comment.findUnique.mockResolvedValue(null);

      const result = await deleteComment({
        commentId: 'comment_nonexistent',
      });

      expect(result).toEqual({
        success: false,
        error: 'Comment not found or access denied',
      });
    });
  });

  describe('Member Lookup', () => {
    it('should handle missing member record', async () => {
      const { session } = setupAuthMocks();

      const mockComment = {
        id: 'comment_123',
        authorId: 'member_123',
        organizationId: session!.activeOrganizationId,
        attachments: [],
      };

      mockDb.comment.findUnique.mockResolvedValue(mockComment);
      mockDb.member.findFirst.mockResolvedValue(null); // No member found

      const result = await deleteComment({
        commentId: 'comment_123',
      });

      expect(result).toEqual({
        success: false,
        error: 'Not authorized to delete this comment',
      });
    });
  });
});
