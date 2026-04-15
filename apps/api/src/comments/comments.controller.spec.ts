import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

// Mock auth.server to avoid importing better-auth ESM in Jest
jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {},
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

jest.mock('@trycompai/auth', () => ({
  statement: {},
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: jest.Mocked<CommentsService>;

  const mockCommentsService = {
    getComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
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

  const apiKeyAuthContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'api-key',
    isApiKey: true,
    isPlatformAdmin: false,
    userId: undefined,
    userEmail: undefined,
    userRoles: ['admin'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: mockCommentsService }],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get(CommentsService);

    jest.clearAllMocks();
  });

  describe('getComments', () => {
    it('should call commentsService.getComments with correct parameters', async () => {
      const comments = [{ id: 'cmt_1', content: 'Hello' }];
      mockCommentsService.getComments.mockResolvedValue(comments);

      const result = await controller.getComments(
        'org_123',
        'tsk_1',
        'task' as never,
      );

      expect(commentsService.getComments).toHaveBeenCalledWith(
        'org_123',
        'tsk_1',
        'task',
      );
      expect(result).toEqual(comments);
    });
  });

  describe('createComment', () => {
    it('should use authContext.userId for session auth', async () => {
      const dto = {
        content: 'New comment',
        entityId: 'tsk_1',
        entityType: 'task' as never,
      };
      const created = { id: 'cmt_1', ...dto };
      mockCommentsService.createComment.mockResolvedValue(created);

      const result = await controller.createComment(
        'org_123',
        mockAuthContext,
        dto,
      );

      expect(commentsService.createComment).toHaveBeenCalledWith(
        'org_123',
        'usr_123',
        dto,
      );
      expect(result).toEqual(created);
    });

    it('should use dto.userId for API key auth', async () => {
      const dto = {
        content: 'New comment',
        entityId: 'tsk_1',
        entityType: 'task' as never,
        userId: 'usr_api_user',
      };
      const created = { id: 'cmt_1', ...dto };
      mockCommentsService.createComment.mockResolvedValue(created);

      await controller.createComment('org_123', apiKeyAuthContext, dto);

      expect(commentsService.createComment).toHaveBeenCalledWith(
        'org_123',
        'usr_api_user',
        dto,
      );
    });

    it('should throw BadRequestException when API key auth without userId', async () => {
      const dto = {
        content: 'New comment',
        entityId: 'tsk_1',
        entityType: 'task' as never,
      };

      await expect(
        controller.createComment('org_123', apiKeyAuthContext, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when session auth without userId', async () => {
      const noUserContext: AuthContext = {
        ...mockAuthContext,
        isApiKey: false,
        userId: undefined,
      };
      const dto = {
        content: 'New comment',
        entityId: 'tsk_1',
        entityType: 'task' as never,
      };

      await expect(
        controller.createComment('org_123', noUserContext, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateComment', () => {
    it('should call commentsService.updateComment with correct parameters for session auth', async () => {
      const dto = {
        content: 'Updated content',
        contextUrl: 'https://example.com',
      };
      const updated = { id: 'cmt_1', content: 'Updated content' };
      mockCommentsService.updateComment.mockResolvedValue(updated);

      const result = await controller.updateComment(
        'org_123',
        mockAuthContext,
        'cmt_1',
        dto,
      );

      expect(commentsService.updateComment).toHaveBeenCalledWith(
        'org_123',
        'cmt_1',
        'usr_123',
        'Updated content',
        'https://example.com',
      );
      expect(result).toEqual(updated);
    });

    it('should use dto.userId for API key auth on update', async () => {
      const dto = { content: 'Updated', userId: 'usr_api_user' };
      mockCommentsService.updateComment.mockResolvedValue({ id: 'cmt_1' });

      await controller.updateComment(
        'org_123',
        apiKeyAuthContext,
        'cmt_1',
        dto,
      );

      expect(commentsService.updateComment).toHaveBeenCalledWith(
        'org_123',
        'cmt_1',
        'usr_api_user',
        'Updated',
        undefined,
      );
    });

    it('should throw BadRequestException when API key auth without userId on update', async () => {
      const dto = { content: 'Updated' };

      await expect(
        controller.updateComment('org_123', apiKeyAuthContext, 'cmt_1', dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteComment', () => {
    it('should call commentsService.deleteComment and return success for session auth', async () => {
      mockCommentsService.deleteComment.mockResolvedValue(undefined);

      const result = await controller.deleteComment(
        'org_123',
        mockAuthContext,
        'cmt_1',
        {},
      );

      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        'org_123',
        'cmt_1',
        'usr_123',
      );
      expect(result).toEqual({
        success: true,
        deletedCommentId: 'cmt_1',
        message: 'Comment deleted successfully',
      });
    });

    it('should use dto.userId for API key auth on delete', async () => {
      mockCommentsService.deleteComment.mockResolvedValue(undefined);

      await controller.deleteComment('org_123', apiKeyAuthContext, 'cmt_1', {
        userId: 'usr_api_user',
      });

      expect(commentsService.deleteComment).toHaveBeenCalledWith(
        'org_123',
        'cmt_1',
        'usr_api_user',
      );
    });

    it('should throw BadRequestException when API key auth without userId on delete', async () => {
      await expect(
        controller.deleteComment('org_123', apiKeyAuthContext, 'cmt_1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
