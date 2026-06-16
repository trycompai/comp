// Mock the DB layer before importing the service. We spread the real Prisma
// client so generated enums (TaskStatus, TaskFrequency) keep their values.
jest.mock('@db', () => ({
  ...jest.requireActual('@prisma/client'),
  db: {
    task: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// checkAutoCompletePhases reaches into the DB; stub it out for unit tests.
jest.mock('../frameworks/frameworks-timeline.helper', () => ({
  checkAutoCompletePhases: jest.fn().mockResolvedValue(undefined),
}));

// The service's transitive imports pull in @trycompai/auth (ESM better-auth)
// which jest can't transform; stub it as the controller spec does.
jest.mock('@trycompai/auth', () => ({
  statement: {
    task: ['create', 'read', 'update', 'delete'],
    evidence: ['create', 'read', 'delete'],
  },
  BUILT_IN_ROLE_PERMISSIONS: {},
}));

jest.mock('../auth/auth.server', () => ({
  auth: { api: { getSession: jest.fn() } },
}));

import { Test } from '@nestjs/testing';
import { db, TaskStatus } from '@db';
import { TaskNotifierService } from './task-notifier.service';
import { TimelinesService } from '../timelines/timelines.service';
import { TasksService } from './tasks.service';

const taskFindFirst = db.task.findFirst as jest.Mock;
const taskUpdate = db.task.update as jest.Mock;
const taskUpdateMany = db.task.updateMany as jest.Mock;
const orgFindUnique = db.organization.findUnique as jest.Mock;
const memberFindFirst = db.member.findFirst as jest.Mock;
const auditLogCreate = db.auditLog.create as jest.Mock;

const ORG_ID = 'org_1';
const TASK_ID = 'tsk_1';
const USER_ID = 'usr_1';

// Builds the existingTask row updateTask() reads. evidenceApprovalEnabled is
// folded into the task's organization relation (a single query); pass null to
// simulate a missing organization row.
const existing = (
  approvalEnabled: boolean | null,
  overrides: Record<string, unknown> = {},
) => ({
  id: TASK_ID,
  title: 'Test task',
  status: TaskStatus.todo,
  assigneeId: null,
  approverId: null,
  frequency: null,
  organization:
    approvalEnabled === null
      ? null
      : { evidenceApprovalEnabled: approvalEnabled },
  ...overrides,
});

describe('TasksService approval gating', () => {
  let service: TasksService;

  const notifier = {
    notifyStatusChange: jest.fn().mockResolvedValue(undefined),
    notifyAssigneeChange: jest.fn().mockResolvedValue(undefined),
    notifyBulkStatusChange: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TaskNotifierService, useValue: notifier },
        { provide: TimelinesService, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(TasksService);
    memberFindFirst.mockResolvedValue({ id: 'mem_actor', user: { role: 'owner' } });
    taskUpdate.mockResolvedValue({ id: TASK_ID });
    auditLogCreate.mockResolvedValue({});
  });

  const lastUpdateData = () => taskUpdate.mock.calls[0][0].data;

  describe('updateTask', () => {
    it('REGRESSION: approval OFF + stale approver allows todo→done and clears the approver', async () => {
      taskFindFirst.mockResolvedValue(existing(false, { approverId: 'mem_appr' }));

      await service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID);

      expect(taskUpdate).toHaveBeenCalledTimes(1);
      expect(lastUpdateData().status).toBe(TaskStatus.done);
      expect(lastUpdateData().approverId).toBeNull();
    });

    it('PRESERVE: approval ON + approver assigned blocks a direct todo→done', async () => {
      taskFindFirst.mockResolvedValue(existing(true, { approverId: 'mem_appr' }));

      await expect(
        service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID),
      ).rejects.toThrow(
        'Cannot mark task as done directly when an approver is assigned. Submit for review instead.',
      );
      expect(taskUpdate).not.toHaveBeenCalled();
    });

    it('ALLOWED: approval ON + no approver allows todo→done', async () => {
      taskFindFirst.mockResolvedValue(existing(true, { approverId: null }));

      await service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID);

      expect(taskUpdate).toHaveBeenCalledTimes(1);
      expect(lastUpdateData().status).toBe(TaskStatus.done);
    });

    it('SYMMETRIC: approval OFF lets an in_review task move to done and clears the approver', async () => {
      taskFindFirst.mockResolvedValue(
        existing(false, { status: TaskStatus.in_review, approverId: 'mem_appr' }),
      );

      await service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID);

      expect(lastUpdateData().status).toBe(TaskStatus.done);
      expect(lastUpdateData().approverId).toBeNull();
    });

    it('IN_REVIEW LOCK: approval ON blocks moving an in_review task directly', async () => {
      taskFindFirst.mockResolvedValue(existing(true, { status: TaskStatus.in_review }));

      await expect(
        service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.todo }, USER_ID),
      ).rejects.toThrow('Cannot change status directly while task is in review');
      expect(taskUpdate).not.toHaveBeenCalled();
    });

    it('SELF-HEAL GUARD: an explicit approverId from the caller is not force-cleared', async () => {
      taskFindFirst.mockResolvedValue(existing(false, { approverId: 'mem_old' }));

      await service.updateTask(ORG_ID, TASK_ID, { approverId: 'mem_new' }, USER_ID);

      expect(lastUpdateData().approverId).toBe('mem_new');
    });

    it('NO-OP: approval OFF + no approver leaves approverId untouched on todo→done', async () => {
      taskFindFirst.mockResolvedValue(existing(false, { approverId: null }));

      await service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID);

      expect(lastUpdateData().status).toBe(TaskStatus.done);
      expect(lastUpdateData().approverId).toBeUndefined();
    });

    it('DEFENSIVE: a missing organization row is treated as approval disabled', async () => {
      taskFindFirst.mockResolvedValue(existing(null, { approverId: 'mem_appr' }));

      await service.updateTask(ORG_ID, TASK_ID, { status: TaskStatus.done }, USER_ID);

      expect(lastUpdateData().status).toBe(TaskStatus.done);
      expect(lastUpdateData().approverId).toBeNull();
    });
  });

  describe('updateTasksStatus (bulk)', () => {
    it('approval OFF: bulk done does not exclude approver-assigned / in_review tasks', async () => {
      orgFindUnique.mockResolvedValue({ evidenceApprovalEnabled: false });
      taskUpdateMany.mockResolvedValue({ count: 1 });

      await service.updateTasksStatus(
        ORG_ID,
        [TASK_ID],
        TaskStatus.done,
        undefined,
        USER_ID,
      );

      const where = taskUpdateMany.mock.calls[0][0].where;
      expect(where).toEqual({ id: { in: [TASK_ID] }, organizationId: ORG_ID });
      expect(where.approverId).toBeUndefined();
      expect(where.status).toBeUndefined();
    });

    it('approval ON: bulk done excludes approver-assigned and in_review tasks', async () => {
      orgFindUnique.mockResolvedValue({ evidenceApprovalEnabled: true });
      taskUpdateMany.mockResolvedValue({ count: 1 });

      await service.updateTasksStatus(
        ORG_ID,
        [TASK_ID],
        TaskStatus.done,
        undefined,
        USER_ID,
      );

      const where = taskUpdateMany.mock.calls[0][0].where;
      expect(where.approverId).toBeNull();
      expect(where.status).toEqual({ not: 'in_review' });
    });
  });
});
