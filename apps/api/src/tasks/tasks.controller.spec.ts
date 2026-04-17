import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TaskStatus } from '@db';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import type { AuthContext } from '../auth/types';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AttachmentsService } from '../attachments/attachments.service';

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
  statement: {
    task: ['create', 'read', 'update', 'delete'],
    evidence: ['create', 'read', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

describe('TasksController', () => {
  let controller: TasksController;

  const mockTasksService = {
    getTasks: jest.fn(),
    getTask: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
    deleteTasks: jest.fn(),
    updateTasksStatus: jest.fn(),
    updateTasksAssignee: jest.fn(),
    reorderTasks: jest.fn(),
    getTaskActivity: jest.fn(),
    getTaskPageOptions: jest.fn(),
    regenerateFromTemplate: jest.fn(),
    verifyTaskAccess: jest.fn(),
    submitForReview: jest.fn(),
    bulkSubmitForReview: jest.fn(),
    approveTask: jest.fn(),
    rejectTask: jest.fn(),
    getApiKeyActorUserId: jest.fn(),
  };

  const mockAttachmentsService = {
    getAttachments: jest.fn(),
    uploadAttachment: jest.fn(),
    getAttachmentDownloadUrl: jest.fn(),
    deleteAttachment: jest.fn(),
    getAttachmentById: jest.fn(),
  };

  const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

  const authContext: AuthContext = {
    organizationId: 'org_123',
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_123',
    userEmail: 'test@example.com',
    userRoles: ['admin'],
    memberId: 'mem_123',
  };

  const orgId = 'org_123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: AttachmentsService, useValue: mockAttachmentsService },
      ],
    })
      .overrideGuard(HybridAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TasksController>(TasksController);
    jest.clearAllMocks();
  });

  // ==================== GET TASKS ====================

  describe('getTasks', () => {
    it('should call tasksService.getTasks with organizationId and assignment filter', async () => {
      const mockTasks = [{ id: 'tsk_1', title: 'Test Task' }];
      mockTasksService.getTasks.mockResolvedValue(mockTasks);

      const result = await controller.getTasks(orgId, authContext);

      expect(mockTasksService.getTasks).toHaveBeenCalledWith(
        orgId,
        {}, // admin role = no assignment filter
        { includeRelations: false },
      );
      expect(result).toEqual(mockTasks);
    });

    it('should pass includeRelations=true when query param is "true"', async () => {
      mockTasksService.getTasks.mockResolvedValue([]);

      await controller.getTasks(orgId, authContext, 'true');

      expect(mockTasksService.getTasks).toHaveBeenCalledWith(
        orgId,
        {},
        { includeRelations: true },
      );
    });

    it('should apply assignment filter for employee role', async () => {
      const employeeAuth: AuthContext = {
        ...authContext,
        userRoles: ['employee'],
      };
      mockTasksService.getTasks.mockResolvedValue([]);

      await controller.getTasks(orgId, employeeAuth);

      expect(mockTasksService.getTasks).toHaveBeenCalledWith(
        orgId,
        { assigneeId: 'mem_123' },
        { includeRelations: false },
      );
    });
  });

  // ==================== CREATE TASK ====================

  describe('createTask', () => {
    it('should call tasksService.createTask with organizationId and body', async () => {
      const body = { title: 'New Task', description: 'Description' };
      const mockTask = { id: 'tsk_1', ...body };
      mockTasksService.createTask.mockResolvedValue(mockTask);

      const result = await controller.createTask(orgId, body);

      expect(mockTasksService.createTask).toHaveBeenCalledWith(orgId, body);
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException if title is missing', async () => {
      const body = { title: '', description: 'Description' };

      await expect(controller.createTask(orgId, body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if description is missing', async () => {
      const body = { title: 'Task', description: '' };

      await expect(controller.createTask(orgId, body)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== UPDATE TASKS STATUS (BULK) ====================

  describe('updateTasksStatus', () => {
    it('should call tasksService.updateTasksStatus with correct params', async () => {
      const body = {
        taskIds: ['tsk_1', 'tsk_2'],
        status: TaskStatus.done,
      };
      mockTasksService.updateTasksStatus.mockResolvedValue({
        updatedCount: 2,
      });

      const result = await controller.updateTasksStatus(
        orgId,
        authContext,
        body,
      );

      expect(mockTasksService.updateTasksStatus).toHaveBeenCalledWith(
        orgId,
        ['tsk_1', 'tsk_2'],
        TaskStatus.done,
        undefined,
        'usr_123',
      );
      expect(result).toEqual({ updatedCount: 2 });
    });

    it('should parse reviewDate when provided', async () => {
      const body = {
        taskIds: ['tsk_1'],
        status: TaskStatus.done,
        reviewDate: '2025-06-01T00:00:00.000Z',
      };
      mockTasksService.updateTasksStatus.mockResolvedValue({
        updatedCount: 1,
      });

      await controller.updateTasksStatus(orgId, authContext, body);

      expect(mockTasksService.updateTasksStatus).toHaveBeenCalledWith(
        orgId,
        ['tsk_1'],
        TaskStatus.done,
        new Date('2025-06-01T00:00:00.000Z'),
        'usr_123',
      );
    });

    it('should throw BadRequestException if taskIds is empty', async () => {
      const body = { taskIds: [], status: TaskStatus.done };

      await expect(
        controller.updateTasksStatus(orgId, authContext, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if status is invalid', async () => {
      const body = {
        taskIds: ['tsk_1'],
        status: 'invalid_status' as TaskStatus,
      };

      await expect(
        controller.updateTasksStatus(orgId, authContext, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid reviewDate', async () => {
      const body = {
        taskIds: ['tsk_1'],
        status: TaskStatus.done,
        reviewDate: 'not-a-date',
      };

      await expect(
        controller.updateTasksStatus(orgId, authContext, body),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use getApiKeyActorUserId for API key auth', async () => {
      const apiKeyAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
        isApiKey: true,
        authType: 'api-key',
      };
      mockTasksService.getApiKeyActorUserId.mockResolvedValue('usr_api');
      mockTasksService.updateTasksStatus.mockResolvedValue({
        updatedCount: 1,
      });

      await controller.updateTasksStatus(orgId, apiKeyAuth, {
        taskIds: ['tsk_1'],
        status: TaskStatus.done,
      });

      expect(mockTasksService.getApiKeyActorUserId).toHaveBeenCalledWith(orgId);
      expect(mockTasksService.updateTasksStatus).toHaveBeenCalledWith(
        orgId,
        ['tsk_1'],
        TaskStatus.done,
        undefined,
        'usr_api',
      );
    });
  });

  // ==================== UPDATE TASKS ASSIGNEE (BULK) ====================

  describe('updateTasksAssignee', () => {
    it('should call tasksService.updateTasksAssignee with correct params', async () => {
      const body = { taskIds: ['tsk_1'], assigneeId: 'mem_456' };
      mockTasksService.updateTasksAssignee.mockResolvedValue({
        updatedCount: 1,
      });

      const result = await controller.updateTasksAssignee(
        orgId,
        authContext,
        body,
      );

      expect(mockTasksService.updateTasksAssignee).toHaveBeenCalledWith(
        orgId,
        ['tsk_1'],
        'mem_456',
        'usr_123',
      );
      expect(result).toEqual({ updatedCount: 1 });
    });

    it('should pass null when assigneeId is null', async () => {
      const body = { taskIds: ['tsk_1'], assigneeId: null };
      mockTasksService.updateTasksAssignee.mockResolvedValue({
        updatedCount: 1,
      });

      await controller.updateTasksAssignee(orgId, authContext, body);

      expect(mockTasksService.updateTasksAssignee).toHaveBeenCalledWith(
        orgId,
        ['tsk_1'],
        null,
        'usr_123',
      );
    });

    it('should throw BadRequestException if taskIds is empty', async () => {
      await expect(
        controller.updateTasksAssignee(orgId, authContext, {
          taskIds: [],
          assigneeId: 'mem_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== REORDER TASKS ====================

  describe('reorderTasks', () => {
    it('should call tasksService.reorderTasks and return success', async () => {
      const updates = [
        { id: 'tsk_1', order: 0, status: TaskStatus.todo },
        { id: 'tsk_2', order: 1, status: TaskStatus.in_progress },
      ];
      mockTasksService.reorderTasks.mockResolvedValue(undefined);

      const result = await controller.reorderTasks(orgId, { updates });

      expect(mockTasksService.reorderTasks).toHaveBeenCalledWith(
        orgId,
        updates,
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw BadRequestException if updates is empty', async () => {
      await expect(
        controller.reorderTasks(orgId, { updates: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== BULK SUBMIT FOR REVIEW ====================

  describe('bulkSubmitForReview', () => {
    it('should call tasksService.bulkSubmitForReview with correct params', async () => {
      const body = { taskIds: ['tsk_1', 'tsk_2'], approverId: 'mem_456' };
      mockTasksService.bulkSubmitForReview.mockResolvedValue({
        submittedCount: 2,
      });

      const result = await controller.bulkSubmitForReview(
        orgId,
        authContext,
        body,
      );

      expect(mockTasksService.bulkSubmitForReview).toHaveBeenCalledWith(
        orgId,
        ['tsk_1', 'tsk_2'],
        'usr_123',
        'mem_456',
      );
      expect(result).toEqual({ submittedCount: 2 });
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const noUserAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
      };

      await expect(
        controller.bulkSubmitForReview(orgId, noUserAuth, {
          taskIds: ['tsk_1'],
          approverId: 'mem_456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if taskIds is empty', async () => {
      await expect(
        controller.bulkSubmitForReview(orgId, authContext, {
          taskIds: [],
          approverId: 'mem_456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if approverId is missing', async () => {
      await expect(
        controller.bulkSubmitForReview(orgId, authContext, {
          taskIds: ['tsk_1'],
          approverId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== DELETE TASKS (BULK) ====================

  describe('deleteTasks', () => {
    it('should call tasksService.deleteTasks with correct params', async () => {
      mockTasksService.deleteTasks.mockResolvedValue({ deletedCount: 2 });

      const result = await controller.deleteTasks(orgId, {
        taskIds: ['tsk_1', 'tsk_2'],
      });

      expect(mockTasksService.deleteTasks).toHaveBeenCalledWith(orgId, [
        'tsk_1',
        'tsk_2',
      ]);
      expect(result).toEqual({ deletedCount: 2 });
    });

    it('should throw BadRequestException if taskIds is empty', async () => {
      await expect(
        controller.deleteTasks(orgId, { taskIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== GET TASK OPTIONS ====================

  describe('getTaskOptions', () => {
    it('should call tasksService.getTaskPageOptions with organizationId and userId', async () => {
      const options = { members: [], controls: [] };
      mockTasksService.getTaskPageOptions.mockResolvedValue(options);

      const result = await controller.getTaskOptions(orgId, authContext);

      expect(mockTasksService.getTaskPageOptions).toHaveBeenCalledWith(
        orgId,
        'usr_123',
      );
      expect(result).toEqual(options);
    });
  });

  // ==================== GET TASK BY ID ====================

  describe('getTask', () => {
    it('should return the task for admin user', async () => {
      const mockTask = {
        id: 'tsk_1',
        title: 'Test',
        assigneeId: 'mem_other',
      };
      mockTasksService.getTask.mockResolvedValue(mockTask);

      const result = await controller.getTask(orgId, 'tsk_1', authContext);

      expect(mockTasksService.getTask).toHaveBeenCalledWith(orgId, 'tsk_1');
      expect(result).toEqual(mockTask);
    });

    it('should throw ForbiddenException for employee not assigned to task', async () => {
      const employeeAuth: AuthContext = {
        ...authContext,
        userRoles: ['employee'],
        memberId: 'mem_123',
      };
      const mockTask = {
        id: 'tsk_1',
        title: 'Test',
        assigneeId: 'mem_other',
      };
      mockTasksService.getTask.mockResolvedValue(mockTask);

      await expect(
        controller.getTask(orgId, 'tsk_1', employeeAuth),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow employee to access their own assigned task', async () => {
      const employeeAuth: AuthContext = {
        ...authContext,
        userRoles: ['employee'],
        memberId: 'mem_123',
      };
      const mockTask = {
        id: 'tsk_1',
        title: 'Test',
        assigneeId: 'mem_123',
      };
      mockTasksService.getTask.mockResolvedValue(mockTask);

      const result = await controller.getTask(orgId, 'tsk_1', employeeAuth);

      expect(result).toEqual(mockTask);
    });
  });

  // ==================== GET TASK ACTIVITY ====================

  describe('getTaskActivity', () => {
    it('should call tasksService.getTaskActivity with parsed skip/take', async () => {
      const activity = { items: [], total: 0 };
      mockTasksService.getTaskActivity.mockResolvedValue(activity);

      const result = await controller.getTaskActivity(
        orgId,
        'tsk_1',
        '5',
        '20',
      );

      expect(mockTasksService.getTaskActivity).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        5,
        20,
      );
      expect(result).toEqual(activity);
    });

    it('should default skip to 0 and take to 10', async () => {
      mockTasksService.getTaskActivity.mockResolvedValue({ items: [] });

      await controller.getTaskActivity(orgId, 'tsk_1');

      expect(mockTasksService.getTaskActivity).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        0,
        10,
      );
    });

    it('should cap take at 50', async () => {
      mockTasksService.getTaskActivity.mockResolvedValue({ items: [] });

      await controller.getTaskActivity(orgId, 'tsk_1', '0', '100');

      expect(mockTasksService.getTaskActivity).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        0,
        50,
      );
    });
  });

  // ==================== UPDATE TASK ====================

  describe('updateTask', () => {
    it('should call tasksService.updateTask with correct params', async () => {
      const body = { title: 'Updated', status: TaskStatus.done };
      const mockTask = { id: 'tsk_1', ...body };
      mockTasksService.updateTask.mockResolvedValue(mockTask);

      const result = await controller.updateTask(
        orgId,
        authContext,
        'tsk_1',
        body,
      );

      expect(mockTasksService.updateTask).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        {
          title: 'Updated',
          description: undefined,
          status: TaskStatus.done,
          assigneeId: undefined,
          approverId: undefined,
          frequency: undefined,
          department: undefined,
          reviewDate: undefined,
        },
        'usr_123',
      );
      expect(result).toEqual(mockTask);
    });

    it('should parse reviewDate when provided', async () => {
      const body = { reviewDate: '2025-06-01T00:00:00.000Z' };
      mockTasksService.updateTask.mockResolvedValue({ id: 'tsk_1' });

      await controller.updateTask(orgId, authContext, 'tsk_1', body);

      const updateCall = mockTasksService.updateTask.mock.calls[0];
      expect(updateCall[2].reviewDate).toEqual(
        new Date('2025-06-01T00:00:00.000Z'),
      );
    });

    it('should throw BadRequestException for invalid reviewDate', async () => {
      const body = { reviewDate: 'not-a-date' };

      await expect(
        controller.updateTask(orgId, authContext, 'tsk_1', body),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use getApiKeyActorUserId for API key auth', async () => {
      const apiKeyAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
        isApiKey: true,
        authType: 'api-key',
      };
      mockTasksService.getApiKeyActorUserId.mockResolvedValue('usr_api');
      mockTasksService.updateTask.mockResolvedValue({ id: 'tsk_1' });

      await controller.updateTask(orgId, apiKeyAuth, 'tsk_1', {
        title: 'Updated',
      });

      expect(mockTasksService.getApiKeyActorUserId).toHaveBeenCalledWith(orgId);
    });
  });

  // ==================== REGENERATE TASK ====================

  describe('regenerateTask', () => {
    it('should call tasksService.regenerateFromTemplate', async () => {
      const mockResult = { id: 'tsk_1', title: 'Regenerated' };
      mockTasksService.regenerateFromTemplate.mockResolvedValue(mockResult);

      const result = await controller.regenerateTask(orgId, 'tsk_1');

      expect(mockTasksService.regenerateFromTemplate).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
      );
      expect(result).toEqual(mockResult);
    });
  });

  // ==================== DELETE TASK ====================

  describe('deleteTask', () => {
    it('should call tasksService.deleteTask and return success', async () => {
      mockTasksService.deleteTask.mockResolvedValue(undefined);

      const result = await controller.deleteTask(orgId, 'tsk_1');

      expect(mockTasksService.deleteTask).toHaveBeenCalledWith(orgId, 'tsk_1');
      expect(result).toEqual({
        success: true,
        message: 'Task deleted successfully',
      });
    });
  });

  // ==================== SUBMIT FOR REVIEW ====================

  describe('submitForReview', () => {
    it('should call tasksService.submitForReview with correct params', async () => {
      const mockTask = { id: 'tsk_1', status: 'in_review' };
      mockTasksService.submitForReview.mockResolvedValue(mockTask);

      const result = await controller.submitForReview(
        orgId,
        authContext,
        'tsk_1',
        { approverId: 'mem_456' },
      );

      expect(mockTasksService.submitForReview).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'usr_123',
        'mem_456',
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const noUserAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
      };

      await expect(
        controller.submitForReview(orgId, noUserAuth, 'tsk_1', {
          approverId: 'mem_456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if approverId is missing', async () => {
      await expect(
        controller.submitForReview(orgId, authContext, 'tsk_1', {
          approverId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== APPROVE TASK ====================

  describe('approveTask', () => {
    it('should call tasksService.approveTask with correct params', async () => {
      const mockTask = { id: 'tsk_1', status: 'done' };
      mockTasksService.approveTask.mockResolvedValue(mockTask);

      const result = await controller.approveTask(orgId, authContext, 'tsk_1');

      expect(mockTasksService.approveTask).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'usr_123',
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const noUserAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
      };

      await expect(
        controller.approveTask(orgId, noUserAuth, 'tsk_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== REJECT TASK ====================

  describe('rejectTask', () => {
    it('should call tasksService.rejectTask with correct params', async () => {
      const mockTask = { id: 'tsk_1', status: 'todo' };
      mockTasksService.rejectTask.mockResolvedValue(mockTask);

      const result = await controller.rejectTask(orgId, authContext, 'tsk_1');

      expect(mockTasksService.rejectTask).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'usr_123',
      );
      expect(result).toEqual(mockTask);
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const noUserAuth: AuthContext = {
        ...authContext,
        userId: undefined as unknown as string,
      };

      await expect(
        controller.rejectTask(orgId, noUserAuth, 'tsk_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== TASK ATTACHMENTS ====================

  describe('getTaskAttachments', () => {
    it('should verify access and return attachments', async () => {
      const mockAttachments = [{ id: 'att_1', name: 'file.pdf' }];
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.getAttachments.mockResolvedValue(mockAttachments);

      const result = await controller.getTaskAttachments(orgId, 'tsk_1');

      expect(mockTasksService.verifyTaskAccess).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
      );
      expect(mockAttachmentsService.getAttachments).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'task',
      );
      expect(result).toEqual(mockAttachments);
    });
  });

  describe('uploadTaskAttachment', () => {
    it('should verify access and upload attachment for session auth', async () => {
      const uploadDto = {
        fileName: 'file.pdf',
        fileType: 'application/pdf',
        fileContent: 'base64data',
      };
      const mockAttachment = { id: 'att_1' };
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.uploadAttachment.mockResolvedValue(mockAttachment);

      const result = await controller.uploadTaskAttachment(
        authContext,
        'tsk_1',
        uploadDto as never,
      );

      expect(mockTasksService.verifyTaskAccess).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
      );
      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'task',
        uploadDto,
        'usr_123',
      );
      expect(result).toEqual(mockAttachment);
    });

    it('should throw BadRequestException for API key auth without userId', async () => {
      const apiKeyAuth: AuthContext = {
        ...authContext,
        isApiKey: true,
        authType: 'api-key',
      };
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);

      await expect(
        controller.uploadTaskAttachment(apiKeyAuth, 'tsk_1', {
          fileName: 'file.pdf',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use userId from DTO for API key auth', async () => {
      const apiKeyAuth: AuthContext = {
        ...authContext,
        isApiKey: true,
        authType: 'api-key',
      };
      const uploadDto = {
        fileName: 'file.pdf',
        userId: 'usr_dto',
      };
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.uploadAttachment.mockResolvedValue({
        id: 'att_1',
      });

      await controller.uploadTaskAttachment(
        apiKeyAuth,
        'tsk_1',
        uploadDto as never,
      );

      expect(mockAttachmentsService.uploadAttachment).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
        'task',
        uploadDto,
        'usr_dto',
      );
    });
  });

  describe('getTaskAttachmentDownloadUrl', () => {
    it('should verify access and return download URL', async () => {
      const downloadResult = {
        downloadUrl: 'https://example.com/file',
        expiresIn: 900,
      };
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.getAttachmentDownloadUrl.mockResolvedValue(
        downloadResult,
      );

      const result = await controller.getTaskAttachmentDownloadUrl(
        orgId,
        'tsk_1',
        'att_1',
      );

      expect(mockTasksService.verifyTaskAccess).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
      );
      expect(
        mockAttachmentsService.getAttachmentDownloadUrl,
      ).toHaveBeenCalledWith(orgId, 'att_1');
      expect(result).toEqual(downloadResult);
    });
  });

  describe('deleteTaskAttachment', () => {
    it('should verify access, get attachment, delete, and return result', async () => {
      const mockAttachment = { name: 'file.pdf', type: 'application/pdf' };
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.getAttachmentById.mockResolvedValue(
        mockAttachment,
      );
      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      const result = await controller.deleteTaskAttachment(
        orgId,
        'tsk_1',
        'att_1',
      );

      expect(mockTasksService.verifyTaskAccess).toHaveBeenCalledWith(
        orgId,
        'tsk_1',
      );
      expect(mockAttachmentsService.getAttachmentById).toHaveBeenCalledWith(
        orgId,
        'att_1',
      );
      expect(mockAttachmentsService.deleteAttachment).toHaveBeenCalledWith(
        orgId,
        'att_1',
      );
      expect(result).toEqual({
        success: true,
        deletedAttachmentId: 'att_1',
        fileName: 'file.pdf',
        fileType: 'application/pdf',
        message: 'Attachment deleted successfully',
      });
    });

    it('should handle null attachment gracefully', async () => {
      mockTasksService.verifyTaskAccess.mockResolvedValue(undefined);
      mockAttachmentsService.getAttachmentById.mockResolvedValue(null);
      mockAttachmentsService.deleteAttachment.mockResolvedValue(undefined);

      const result = await controller.deleteTaskAttachment(
        orgId,
        'tsk_1',
        'att_1',
      );

      expect(result.fileName).toBeNull();
      expect(result.fileType).toBeNull();
    });
  });
});
