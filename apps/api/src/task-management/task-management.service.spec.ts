import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TaskManagementService } from './task-management.service';
import { TaskItemAssignmentNotifierService } from './task-item-assignment-notifier.service';
import { TaskItemMentionNotifierService } from './task-item-mention-notifier.service';
import { TaskItemAuditService } from './task-item-audit.service';
import type { AuthContext } from '../auth/types';

jest.mock('@db', () => ({
  db: {
    taskItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
  },
  TaskItemStatus: {
    todo: 'todo',
    in_progress: 'in_progress',
    in_review: 'in_review',
    done: 'done',
    canceled: 'canceled',
  },
  TaskItemPriority: {
    low: 'low',
    medium: 'medium',
    high: 'high',
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { db } = require('@db') as {
  db: {
    taskItem: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    member: { findFirst: jest.Mock };
  };
};

describe('TaskManagementService — API key actor fallback', () => {
  let service: TaskManagementService;

  const auditMock = {
    logTaskItemCreated: jest.fn(),
    logTaskItemUpdated: jest.fn(),
    logTaskItemDeleted: jest.fn(),
  };

  const orgId = 'org_abc';
  const taskItemId = 'tski_1';

  const apiKeyAuth: AuthContext = {
    organizationId: orgId,
    authType: 'api-key',
    isApiKey: true,
    isPlatformAdmin: false,
    userRoles: null,
  };

  const sessionAuth: AuthContext = {
    organizationId: orgId,
    authType: 'session',
    isApiKey: false,
    isPlatformAdmin: false,
    userId: 'usr_session',
    userEmail: 'me@example.com',
    userRoles: ['admin'],
  };

  const memberRelation = {
    id: 'mem_owner',
    user: {
      id: 'usr_owner',
      name: 'Owner',
      email: 'owner@example.com',
      image: null,
    },
  };

  const builtTaskItem = {
    id: taskItemId,
    title: 'Verify risk assessment',
    description: null,
    status: 'todo',
    priority: 'medium',
    entityType: 'vendor',
    entityId: 'vnd_1',
    assigneeId: null,
    assignee: null,
    createdBy: memberRelation,
    updatedBy: memberRelation,
    createdAt: new Date('2026-05-27T00:00:00Z'),
    updatedAt: new Date('2026-05-27T00:00:00Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskManagementService,
        { provide: TaskItemAssignmentNotifierService, useValue: { notifyAssignee: jest.fn() } },
        { provide: TaskItemMentionNotifierService, useValue: { notifyMentioned: jest.fn() } },
        { provide: TaskItemAuditService, useValue: auditMock },
      ],
    }).compile();
    service = module.get<TaskManagementService>(TaskManagementService);
  });

  describe('updateTaskItem', () => {
    it('marks a task done via API key using an owner fallback and logs it as via API key', async () => {
      db.member.findFirst.mockResolvedValueOnce({
        id: 'mem_owner',
        userId: 'usr_owner',
      }); // owner fallback
      db.taskItem.findFirst.mockResolvedValueOnce({ ...builtTaskItem });
      db.taskItem.update.mockResolvedValueOnce({ ...builtTaskItem, status: 'done' });

      await service.updateTaskItem(taskItemId, orgId, apiKeyAuth, {
        status: 'done',
      } as never);

      // updatedById is the resolved owner member
      const updateArg = db.taskItem.update.mock.calls[0][0];
      expect(updateArg.data.updatedById).toBe('mem_owner');
      // explicit "via API key" audit entry written, attributed to the owner
      expect(auditMock.logTaskItemUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner',
          memberId: 'mem_owner',
          viaApiKey: true,
          changes: ['set status to done'],
        }),
      );
    });

    it('throws a clear error when an API key org has no active owner/admin', async () => {
      db.member.findFirst.mockResolvedValue(null); // no owner, no admin

      await expect(
        service.updateTaskItem(taskItemId, orgId, apiKeyAuth, {
          status: 'done',
        } as never),
      ).rejects.toThrow(/Cannot determine an actor/);
      expect(db.taskItem.update).not.toHaveBeenCalled();
    });

    it('uses the session member for session auth and does NOT write an explicit audit entry', async () => {
      db.member.findFirst.mockResolvedValueOnce({
        id: 'mem_session',
        userId: 'usr_session',
      });
      db.taskItem.findFirst.mockResolvedValueOnce({ ...builtTaskItem });
      db.taskItem.update.mockResolvedValueOnce({ ...builtTaskItem, status: 'done' });

      await service.updateTaskItem(taskItemId, orgId, sessionAuth, {
        status: 'done',
      } as never);

      const updateArg = db.taskItem.update.mock.calls[0][0];
      expect(updateArg.data.updatedById).toBe('mem_session');
      // Session audit is handled by the global interceptor — service must not double-log
      expect(auditMock.logTaskItemUpdated).not.toHaveBeenCalled();
    });
  });

  describe('createTaskItem', () => {
    it('creates via API key using an owner fallback and logs it as via API key', async () => {
      db.member.findFirst.mockResolvedValueOnce({
        id: 'mem_owner',
        userId: 'usr_owner',
      });
      db.taskItem.create.mockResolvedValueOnce({ ...builtTaskItem });

      await service.createTaskItem(orgId, apiKeyAuth, {
        title: 'New task',
        entityType: 'vendor',
        entityId: 'vnd_1',
      } as never);

      const createArg = db.taskItem.create.mock.calls[0][0];
      expect(createArg.data.createdById).toBe('mem_owner');
      expect(auditMock.logTaskItemCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner',
          memberId: 'mem_owner',
          viaApiKey: true,
        }),
      );
    });
  });

  describe('deleteTaskItem', () => {
    it('deletes via API key and logs it as via API key', async () => {
      db.taskItem.findFirst.mockResolvedValueOnce({ ...builtTaskItem });
      db.member.findFirst.mockResolvedValueOnce({
        id: 'mem_owner',
        userId: 'usr_owner',
      });
      db.taskItem.delete.mockResolvedValueOnce({});

      await service.deleteTaskItem(taskItemId, orgId, apiKeyAuth);

      expect(db.taskItem.delete).toHaveBeenCalledWith({
        where: { id: taskItemId },
      });
      expect(auditMock.logTaskItemDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_owner',
          memberId: 'mem_owner',
          viaApiKey: true,
        }),
      );
    });

    it('does NOT write an explicit audit entry for session deletes', async () => {
      db.taskItem.findFirst.mockResolvedValueOnce({ ...builtTaskItem });
      db.taskItem.delete.mockResolvedValueOnce({});

      await service.deleteTaskItem(taskItemId, orgId, sessionAuth);

      expect(auditMock.logTaskItemDeleted).not.toHaveBeenCalled();
    });
  });
});
