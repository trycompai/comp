const mockDb = {
  organization: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  task: { findUnique: jest.fn(), findMany: jest.fn() },
  member: { findMany: jest.fn() },
};

jest.mock('@db', () => ({
  db: mockDb,
  TaskStatus: {
    todo: 'todo',
    in_progress: 'in_progress',
    done: 'done',
    not_relevant: 'not_relevant',
  },
}));

const isUserUnsubscribedMock = jest.fn().mockResolvedValue(false);
jest.mock('@trycompai/email', () => ({
  isUserUnsubscribed: (...args: unknown[]) => isUserUnsubscribedMock(...args),
}));

const triggerEmailMock = jest.fn().mockResolvedValue({ id: 'email_1' });
jest.mock('../email/trigger-email', () => ({
  triggerEmail: (...args: unknown[]) => triggerEmailMock(...args),
}));

jest.mock('../email/templates/task-status-changed', () => ({
  TaskStatusChangedEmail: () => null,
}));
jest.mock('../email/templates/task-bulk-status-changed', () => ({
  TaskBulkStatusChangedEmail: () => null,
}));
jest.mock('../email/templates/task-assignee-changed', () => ({
  TaskAssigneeChangedEmail: () => null,
}));
jest.mock('../email/templates/task-bulk-assignee-changed', () => ({
  TaskBulkAssigneeChangedEmail: () => null,
}));
jest.mock('../email/templates/evidence-review-requested', () => ({
  EvidenceReviewRequestedEmail: () => null,
}));
jest.mock('../email/templates/evidence-bulk-review-requested', () => ({
  EvidenceBulkReviewRequestedEmail: () => null,
}));
jest.mock('../email/templates/automation-failures', () => ({
  AutomationFailuresEmail: () => null,
}));
jest.mock('../email/templates/automation-bulk-failures', () => ({
  AutomationBulkFailuresEmail: () => null,
}));

import { TaskNotifierService } from './task-notifier.service';

interface UserFixture {
  id: string;
  name: string | null;
  email: string;
}

function makeUser(id: string, email: string, name: string | null = null): UserFixture {
  return { id, name, email };
}

function recipientEmails(): string[] {
  return triggerEmailMock.mock.calls.map((call) => call[0].to as string);
}

describe('TaskNotifierService', () => {
  const novu = { trigger: jest.fn().mockResolvedValue(undefined) };
  let service: TaskNotifierService;

  beforeEach(() => {
    jest.clearAllMocks();
    isUserUnsubscribedMock.mockResolvedValue(false);
    service = new TaskNotifierService(novu as never);
  });

  describe('notifyStatusChange', () => {
    it('sends email only to the task assignee when the task has an assignee', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');
      const assignee = makeUser('usr_assignee', 'assignee@acme.com', 'Assignee');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findUnique.mockResolvedValue({
        assignee: { user: assignee },
      });

      await service.notifyStatusChange({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        oldStatus: 'done' as never,
        newStatus: 'todo' as never,
        changedByUserId: actor.id,
      });

      expect(triggerEmailMock).toHaveBeenCalledTimes(1);
      expect(recipientEmails()).toEqual(['assignee@acme.com']);
      expect(mockDb.member.findMany).not.toHaveBeenCalled();
    });

    it('does not send email when the actor is the assignee', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findUnique.mockResolvedValue({
        assignee: { user: actor },
      });

      await service.notifyStatusChange({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        oldStatus: 'done' as never,
        newStatus: 'todo' as never,
        changedByUserId: actor.id,
      });

      expect(triggerEmailMock).not.toHaveBeenCalled();
    });

    it('falls back to owners and admins when the task has no assignee', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');
      const owner = makeUser('usr_owner', 'owner@acme.com', 'Owner');
      const admin = makeUser('usr_admin', 'admin@acme.com', 'Admin');
      const employee = makeUser('usr_emp', 'emp@acme.com', 'Emp');
      const auditor = makeUser('usr_aud', 'aud@acme.com', 'Aud');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findUnique.mockResolvedValue({ assignee: null });
      mockDb.member.findMany.mockResolvedValue([
        { role: 'owner', user: owner },
        { role: 'admin', user: admin },
        { role: 'employee', user: employee },
        { role: 'auditor', user: auditor },
      ]);

      await service.notifyStatusChange({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        oldStatus: 'done' as never,
        newStatus: 'todo' as never,
        changedByUserId: actor.id,
      });

      expect(recipientEmails().sort()).toEqual(
        ['admin@acme.com', 'owner@acme.com'].sort(),
      );
    });

    it('excludes the actor from the owner/admin fallback', async () => {
      const actor = makeUser('usr_admin', 'admin@acme.com', 'Admin');
      const owner = makeUser('usr_owner', 'owner@acme.com', 'Owner');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findUnique.mockResolvedValue({ assignee: null });
      mockDb.member.findMany.mockResolvedValue([
        { role: 'admin', user: actor },
        { role: 'owner', user: owner },
      ]);

      await service.notifyStatusChange({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        oldStatus: 'done' as never,
        newStatus: 'todo' as never,
        changedByUserId: actor.id,
      });

      expect(recipientEmails()).toEqual(['owner@acme.com']);
    });

    it('honors isUserUnsubscribed for the assignee', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');
      const assignee = makeUser('usr_assignee', 'assignee@acme.com', 'Assignee');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findUnique.mockResolvedValue({
        assignee: { user: assignee },
      });
      isUserUnsubscribedMock.mockResolvedValue(true);

      await service.notifyStatusChange({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        oldStatus: 'done' as never,
        newStatus: 'todo' as never,
        changedByUserId: actor.id,
      });

      expect(triggerEmailMock).not.toHaveBeenCalled();
    });
  });

  describe('notifyBulkStatusChange', () => {
    it('sends each assignee a bulk email covering only their own tasks', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');
      const assigneeA = makeUser('usr_a', 'a@acme.com', 'A');
      const assigneeB = makeUser('usr_b', 'b@acme.com', 'B');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findMany.mockResolvedValue([
        { id: 'tsk_1', title: 't1', assignee: { user: assigneeA } },
        { id: 'tsk_2', title: 't2', assignee: { user: assigneeA } },
        { id: 'tsk_3', title: 't3', assignee: { user: assigneeB } },
      ]);

      await service.notifyBulkStatusChange({
        organizationId: 'org_1',
        taskIds: ['tsk_1', 'tsk_2', 'tsk_3'],
        newStatus: 'done' as never,
        changedByUserId: actor.id,
      });

      const calls = triggerEmailMock.mock.calls.map((c) => ({
        to: c[0].to,
        subject: c[0].subject,
      }));
      expect(calls.length).toBe(2);

      const aCall = calls.find((c) => c.to === 'a@acme.com');
      const bCall = calls.find((c) => c.to === 'b@acme.com');
      expect(aCall?.subject).toContain('2 tasks');
      expect(bCall?.subject).toContain('1 task');
    });

    it('routes unassigned tasks to owners and admins', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');
      const owner = makeUser('usr_owner', 'owner@acme.com', 'Owner');
      const admin = makeUser('usr_admin', 'admin@acme.com', 'Admin');
      const employee = makeUser('usr_emp', 'emp@acme.com', 'Emp');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findMany.mockResolvedValue([
        { id: 'tsk_1', title: 't1', assignee: null },
        { id: 'tsk_2', title: 't2', assignee: null },
      ]);
      mockDb.member.findMany.mockResolvedValue([
        { role: 'owner', user: owner },
        { role: 'admin', user: admin },
        { role: 'employee', user: employee },
      ]);

      await service.notifyBulkStatusChange({
        organizationId: 'org_1',
        taskIds: ['tsk_1', 'tsk_2'],
        newStatus: 'done' as never,
        changedByUserId: actor.id,
      });

      expect(recipientEmails().sort()).toEqual(
        ['admin@acme.com', 'owner@acme.com'].sort(),
      );
      const aCall = triggerEmailMock.mock.calls.find(
        (c) => c[0].to === 'owner@acme.com',
      );
      expect(aCall?.[0].subject).toContain('2 tasks');
    });

    it('does not send email when actor is the only assignee across tasks', async () => {
      const actor = makeUser('usr_actor', 'actor@acme.com', 'Actor');

      mockDb.organization.findUnique.mockResolvedValue({ name: 'Acme' });
      mockDb.user.findUnique.mockResolvedValue({
        name: actor.name,
        email: actor.email,
      });
      mockDb.task.findMany.mockResolvedValue([
        { id: 'tsk_1', title: 't1', assignee: { user: actor } },
        { id: 'tsk_2', title: 't2', assignee: { user: actor } },
      ]);

      await service.notifyBulkStatusChange({
        organizationId: 'org_1',
        taskIds: ['tsk_1', 'tsk_2'],
        newStatus: 'done' as never,
        changedByUserId: actor.id,
      });

      expect(triggerEmailMock).not.toHaveBeenCalled();
    });
  });

  // Regression: the automation-failure recipient query must apply the
  // internal-org participant filter (orgParticipantMemberWhereForFlag) so
  // platform admins are excluded from customer orgs but included in internal
  // ones. A change to that helper must not silently reroute these notifications.
  const CUSTOMER_PARTICIPANT_WHERE = {
    AND: [{ user: { OR: [{ role: { not: 'admin' } }, { role: null }] } }],
  };

  const memberWhere = () => mockDb.member.findMany.mock.calls[0][0].where;

  describe('notifyAutomationFailures — participant filter', () => {
    it('excludes platform admins for a customer org (isInternal false)', async () => {
      mockDb.organization.findUnique.mockResolvedValue({
        name: 'Acme',
        isInternal: false,
      });
      mockDb.task.findUnique.mockResolvedValue({ assignee: null });
      mockDb.member.findMany.mockResolvedValue([]);

      await service.notifyAutomationFailures({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        failedCount: 1,
        totalCount: 2,
        taskStatusChanged: false,
      });

      expect(memberWhere()).toEqual({
        organizationId: 'org_1',
        deactivated: false,
        ...CUSTOMER_PARTICIPANT_WHERE,
      });
    });

    it('includes platform admins for an internal org (isInternal true)', async () => {
      mockDb.organization.findUnique.mockResolvedValue({
        name: 'Comp AI',
        isInternal: true,
      });
      mockDb.task.findUnique.mockResolvedValue({ assignee: null });
      mockDb.member.findMany.mockResolvedValue([]);

      await service.notifyAutomationFailures({
        organizationId: 'org_1',
        taskId: 'tsk_1',
        taskTitle: '2FA',
        failedCount: 1,
        totalCount: 2,
        taskStatusChanged: false,
      });

      expect(memberWhere()).toEqual({
        organizationId: 'org_1',
        deactivated: false,
      });
    });
  });

  describe('notifyBulkAutomationFailures — participant filter', () => {
    const bulkParams = {
      organizationId: 'org_1',
      tasks: [
        { taskId: 'tsk_1', taskTitle: 't1', failedCount: 1, totalCount: 2 },
      ],
    };

    it('excludes platform admins for a customer org (isInternal false)', async () => {
      mockDb.organization.findUnique.mockResolvedValue({
        name: 'Acme',
        isInternal: false,
      });
      mockDb.task.findMany.mockResolvedValue([{ id: 'tsk_1', assignee: null }]);
      mockDb.member.findMany.mockResolvedValue([]);

      await service.notifyBulkAutomationFailures(bulkParams);

      expect(memberWhere()).toEqual({
        organizationId: 'org_1',
        deactivated: false,
        ...CUSTOMER_PARTICIPANT_WHERE,
      });
    });

    it('includes platform admins for an internal org (isInternal true)', async () => {
      mockDb.organization.findUnique.mockResolvedValue({
        name: 'Comp AI',
        isInternal: true,
      });
      mockDb.task.findMany.mockResolvedValue([{ id: 'tsk_1', assignee: null }]);
      mockDb.member.findMany.mockResolvedValue([]);

      await service.notifyBulkAutomationFailures(bulkParams);

      expect(memberWhere()).toEqual({
        organizationId: 'org_1',
        deactivated: false,
      });
    });
  });
});
