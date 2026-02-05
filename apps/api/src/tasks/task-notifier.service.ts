import { db } from '@db';
import { Injectable, Logger } from '@nestjs/common';
import { TaskStatus } from '@db';
import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { TaskBulkStatusChangedEmail } from '../email/templates/task-bulk-status-changed';
import { TaskBulkAssigneeChangedEmail } from '../email/templates/task-bulk-assignee-changed';
import { TaskStatusChangedEmail } from '../email/templates/task-status-changed';
import { TaskAssigneeChangedEmail } from '../email/templates/task-assignee-changed';
import { NovuService } from '../notifications/novu.service';

const BULK_TASK_WORKFLOW_ID = 'evidence-bulk-updated';
const TASK_WORKFLOW_ID = 'evidence-updated';

@Injectable()
export class TaskNotifierService {
  private readonly logger = new Logger(TaskNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

  async notifyBulkStatusChange(params: {
    organizationId: string;
    taskIds: string[];
    newStatus: TaskStatus;
    changedByUserId: string;
  }): Promise<void> {
    const { organizationId, taskIds, newStatus, changedByUserId } = params;

    try {
      const [organization, changedByUser, tasks, allMembers] =
        await Promise.all([
          db.organization.findUnique({
            where: { id: organizationId },
            select: { name: true },
          }),
          db.user.findUnique({
            where: { id: changedByUserId },
            select: { name: true, email: true },
          }),
          db.task.findMany({
            where: {
              id: { in: taskIds },
              organizationId,
            },
            select: {
              id: true,
              title: true,
              assigneeId: true,
              assignee: {
                select: {
                  id: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          }),
          db.member.findMany({
            where: {
              organizationId,
              deactivated: false,
              OR: [
                { user: { isPlatformAdmin: false } },
                { role: { contains: 'owner' } },
              ],
            },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          }),
        ]);

      this.logger.debug(
        `[notifyBulkStatusChange] Found ${allMembers.length} total members for organization ${organizationId}`,
      );

      const organizationName = organization?.name ?? 'your organization';
      const changedByName =
        changedByUser?.name?.trim() ||
        changedByUser?.email?.trim() ||
        'Someone';

      // Build recipient list: all members excluding actor.
      // The isUserUnsubscribed check handles role-based filtering via the notification matrix.
      const recipientMap = new Map<string, { id: string; name: string; email: string }>();

      for (const member of allMembers) {
        if (member.user?.id && member.user.email) {
          const userId = member.user.id;
          if (userId !== changedByUserId) {
            recipientMap.set(userId, {
              id: userId,
              name:
                member.user.name?.trim() || member.user.email?.trim() || 'User',
              email: member.user.email,
            });
          }
        }
      }

      const recipients = Array.from(recipientMap.values());
      const taskCount = tasks.length;
      const statusLabel = newStatus.replace('_', ' ');

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const tasksUrl = `${appUrl}/${organizationId}/tasks`;

      this.logger.log(
        `Sending bulk status change notifications to ${recipients.length} recipients for ${taskCount} task(s)`,
      );

      // Send notifications to each recipient
      await Promise.allSettled(
        recipients.map(async (recipient) => {
          const isUnsubscribed = await isUserUnsubscribed(
            db,
            recipient.email,
            'taskAssignments',
            organizationId,
          );

          if (isUnsubscribed) {
            this.logger.log(
              `Skipping notification: user ${recipient.email} is unsubscribed from task assignments`,
            );
            return;
          }

          // Send email notification
          try {
            const { id } = await sendEmail({
              to: recipient.email,
              subject: `${taskCount} task${taskCount === 1 ? '' : 's'} status changed to ${statusLabel}`,
              react: TaskBulkStatusChangedEmail({
                toName: recipient.name,
                toEmail: recipient.email,
                taskCount,
                newStatus: statusLabel,
                changedByName,
                organizationName,
                tasksUrl,
              }),
              system: true,
            });

            this.logger.log(
              `Bulk status change email sent to ${recipient.email} (ID: ${id})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send bulk status change email to ${recipient.email}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }

          // Send in-app notification
          try {
            const title = `${taskCount} task${taskCount === 1 ? '' : 's'} status changed`;
            const message = `${changedByName} changed the status of ${taskCount} task${taskCount === 1 ? '' : 's'} to ${statusLabel} in ${organizationName}`;

            await this.novuService.trigger({
              workflowId: BULK_TASK_WORKFLOW_ID,
              subscriberId: `${recipient.id}-${organizationId}`,
              email: recipient.email,
              payload: {
                title,
                message,
                url: tasksUrl,
              },
            });

            this.logger.log(
              `[NOVU] Bulk status change in-app notification sent to ${recipient.id}`,
            );
          } catch (error) {
            this.logger.error(
              `[NOVU] Failed to send bulk status change in-app notification to ${recipient.id}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to send bulk status change notifications',
        error as Error,
      );
    }
  }

  async notifyBulkAssigneeChange(params: {
    organizationId: string;
    taskIds: string[];
    newAssigneeId: string | null;
    changedByUserId: string;
  }): Promise<void> {
    const { organizationId, taskIds, newAssigneeId, changedByUserId } = params;

    try {
      const [organization, changedByUser, tasks, allMembers, newAssigneeMember] =
        await Promise.all([
          db.organization.findUnique({
            where: { id: organizationId },
            select: { name: true },
          }),
          db.user.findUnique({
            where: { id: changedByUserId },
            select: { name: true, email: true },
          }),
          db.task.findMany({
            where: {
              id: { in: taskIds },
              organizationId,
            },
            select: {
              id: true,
              title: true,
            },
          }),
          db.member.findMany({
            where: {
              organizationId,
              deactivated: false,
              OR: [
                { user: { isPlatformAdmin: false } },
                { role: { contains: 'owner' } },
              ],
            },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          }),
          newAssigneeId
            ? db.member.findUnique({
                where: { id: newAssigneeId },
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              })
            : Promise.resolve(null),
        ]);

      this.logger.debug(
        `[notifyBulkAssigneeChange] Found ${allMembers.length} total members for organization ${organizationId}`,
      );

      const organizationName = organization?.name ?? 'your organization';
      const changedByName =
        changedByUser?.name?.trim() ||
        changedByUser?.email?.trim() ||
        'Someone';
      const newAssigneeName = newAssigneeMember?.user
        ? newAssigneeMember.user.name?.trim() ||
          newAssigneeMember.user.email?.trim() ||
          'Unassigned'
        : 'Unassigned';

      // Build recipient list: all members excluding actor.
      // The isUserUnsubscribed check handles role-based filtering via the notification matrix.
      const recipientMap = new Map<string, { id: string; name: string; email: string }>();

      for (const member of allMembers) {
        if (member.user?.id && member.user.email) {
          const userId = member.user.id;
          if (userId !== changedByUserId) {
            recipientMap.set(userId, {
              id: userId,
              name:
                member.user.name?.trim() || member.user.email?.trim() || 'User',
              email: member.user.email,
            });
          }
        }
      }

      const recipients = Array.from(recipientMap.values());
      const taskCount = tasks.length;

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const tasksUrl = `${appUrl}/${organizationId}/tasks`;

      this.logger.log(
        `Sending bulk assignee change notifications to ${recipients.length} recipients for ${taskCount} task(s)`,
      );

      // Send notifications to each recipient
      await Promise.allSettled(
        recipients.map(async (recipient) => {
          const isUnsubscribed = await isUserUnsubscribed(
            db,
            recipient.email,
            'taskAssignments',
            organizationId,
          );

          if (isUnsubscribed) {
            this.logger.log(
              `Skipping notification: user ${recipient.email} is unsubscribed from task assignments`,
            );
            return;
          }

          // Send email notification
          try {
            const { id } = await sendEmail({
              to: recipient.email,
              subject: `${taskCount} task${taskCount === 1 ? '' : 's'} reassigned to ${newAssigneeName}`,
              react: TaskBulkAssigneeChangedEmail({
                toName: recipient.name,
                toEmail: recipient.email,
                taskCount,
                newAssigneeName,
                changedByName,
                organizationName,
                tasksUrl,
              }),
              system: true,
            });

            this.logger.log(
              `Bulk assignee change email sent to ${recipient.email} (ID: ${id})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send bulk assignee change email to ${recipient.email}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }

          // Send in-app notification
          try {
            const title = `${taskCount} task${taskCount === 1 ? '' : 's'} reassigned`;
            const message = `${changedByName} reassigned ${taskCount} task${taskCount === 1 ? '' : 's'} to ${newAssigneeName} in ${organizationName}`;

            await this.novuService.trigger({
              workflowId: BULK_TASK_WORKFLOW_ID,
              subscriberId: `${recipient.id}-${organizationId}`,
              email: recipient.email,
              payload: {
                title,
                message,
                url: tasksUrl,
              },
            });

            this.logger.log(
              `[NOVU] Bulk assignee change in-app notification sent to ${recipient.id}`,
            );
          } catch (error) {
            this.logger.error(
              `[NOVU] Failed to send bulk assignee change in-app notification to ${recipient.id}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to send bulk assignee change notifications',
        error as Error,
      );
    }
  }

  async notifyStatusChange(params: {
    organizationId: string;
    taskId: string;
    taskTitle: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    changedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      taskId,
      taskTitle,
      oldStatus,
      newStatus,
      changedByUserId,
    } = params;

    try {
      const [organization, changedByUser, task, allMembers] = await Promise.all(
        [
          db.organization.findUnique({
            where: { id: organizationId },
            select: { name: true },
          }),
          db.user.findUnique({
            where: { id: changedByUserId },
            select: { name: true, email: true },
          }),
          db.task.findUnique({
            where: { id: taskId },
            select: {
              assignee: {
                select: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          }),
          db.member.findMany({
            where: {
              organizationId,
              deactivated: false,
              OR: [
                { user: { isPlatformAdmin: false } },
                { role: { contains: 'owner' } },
              ],
            },
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          }),
        ],
      );

      this.logger.debug(
        `[notifyStatusChange] Found ${allMembers.length} total members for organization ${organizationId}`,
      );

      const organizationName = organization?.name ?? 'your organization';
      const changedByName =
        changedByUser?.name?.trim() ||
        changedByUser?.email?.trim() ||
        'Someone';
      const oldStatusLabel = oldStatus.replace('_', ' ');
      const newStatusLabel = newStatus.replace('_', ' ');

      // Build recipient list: all members excluding actor.
      // The isUserUnsubscribed check handles role-based filtering via the notification matrix.
      const recipientMap = new Map<string, { id: string; name: string; email: string }>();

      for (const member of allMembers) {
        if (member.user?.id && member.user.email) {
          const userId = member.user.id;
          if (userId !== changedByUserId) {
            recipientMap.set(userId, {
              id: userId,
              name:
                member.user.name?.trim() || member.user.email?.trim() || 'User',
              email: member.user.email,
            });
          }
        }
      }

      const recipients = Array.from(recipientMap.values());

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const taskUrl = `${appUrl}/${organizationId}/tasks/${taskId}`;

      this.logger.log(
        `Sending status change notifications to ${recipients.length} recipients for task "${taskTitle}"`,
      );

      // Send notifications to each recipient
      await Promise.allSettled(
        recipients.map(async (recipient) => {
          const isUnsubscribed = await isUserUnsubscribed(
            db,
            recipient.email,
            'taskAssignments',
            organizationId,
          );

          if (isUnsubscribed) {
            this.logger.log(
              `Skipping notification: user ${recipient.email} is unsubscribed from task assignments`,
            );
            return;
          }

          // Send email notification
          try {
            const { id } = await sendEmail({
              to: recipient.email,
              subject: `Task "${taskTitle}" status changed to ${newStatusLabel}`,
              react: TaskStatusChangedEmail({
                toName: recipient.name,
                toEmail: recipient.email,
                taskTitle,
                oldStatus: oldStatusLabel,
                newStatus: newStatusLabel,
                changedByName,
                organizationName,
                taskUrl,
              }),
              system: true,
            });

            this.logger.log(
              `Status change email sent to ${recipient.email} (ID: ${id})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send status change email to ${recipient.email}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }

          // Send in-app notification
          try {
            const title = `Task status updated`;
            const message = `${changedByName} changed the status of "${taskTitle}" from ${oldStatusLabel} to ${newStatusLabel} in ${organizationName}`;

            await this.novuService.trigger({
              workflowId: TASK_WORKFLOW_ID,
              subscriberId: `${recipient.id}-${organizationId}`,
              email: recipient.email,
              payload: {
                title,
                message,
                url: taskUrl,
              },
            });

            this.logger.log(
              `[NOVU] Status change in-app notification sent to ${recipient.id}`,
            );
          } catch (error) {
            this.logger.error(
              `[NOVU] Failed to send status change in-app notification to ${recipient.id}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to send status change notifications',
        error as Error,
      );
    }
  }

  async notifyAssigneeChange(params: {
    organizationId: string;
    taskId: string;
    taskTitle: string;
    oldAssigneeId: string | null;
    newAssigneeId: string | null;
    changedByUserId: string;
  }): Promise<void> {
    const {
      organizationId,
      taskId,
      taskTitle,
      oldAssigneeId,
      newAssigneeId,
      changedByUserId,
    } = params;

    try {
      const [
        organization,
        changedByUser,
        oldAssigneeMember,
        newAssigneeMember,
        allMembers,
      ] = await Promise.all([
        db.organization.findUnique({
          where: { id: organizationId },
          select: { name: true },
        }),
        db.user.findUnique({
          where: { id: changedByUserId },
          select: { name: true, email: true },
        }),
        oldAssigneeId
          ? db.member.findUnique({
              where: { id: oldAssigneeId },
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
        newAssigneeId
          ? db.member.findUnique({
              where: { id: newAssigneeId },
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
        db.member.findMany({
          where: {
            organizationId,
            deactivated: false,
            OR: [
              { user: { isPlatformAdmin: false } },
              { role: { contains: 'owner' } },
            ],
          },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ]);

      this.logger.debug(
        `[notifyAssigneeChange] Found ${allMembers.length} total members for organization ${organizationId}`,
      );

      const organizationName = organization?.name ?? 'your organization';
      const changedByName =
        changedByUser?.name?.trim() ||
        changedByUser?.email?.trim() ||
        'Someone';
      const oldAssigneeName = oldAssigneeMember?.user
        ? oldAssigneeMember.user.name?.trim() ||
          oldAssigneeMember.user.email?.trim() ||
          'Unassigned'
        : 'Unassigned';
      const newAssigneeName = newAssigneeMember?.user
        ? newAssigneeMember.user.name?.trim() ||
          newAssigneeMember.user.email?.trim() ||
          'Unassigned'
        : 'Unassigned';

      // Build recipient list: all members excluding actor.
      // The isUserUnsubscribed check handles role-based filtering via the notification matrix.
      const recipientMap = new Map<string, { id: string; name: string; email: string }>();

      for (const member of allMembers) {
        if (member.user?.id && member.user.email) {
          const userId = member.user.id;
          if (userId !== changedByUserId) {
            recipientMap.set(userId, {
              id: userId,
              name:
                member.user.name?.trim() || member.user.email?.trim() || 'User',
              email: member.user.email,
            });
          }
        }
      }

      const recipients = Array.from(recipientMap.values());

      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.BETTER_AUTH_URL ??
        'https://app.trycomp.ai';
      const taskUrl = `${appUrl}/${organizationId}/tasks/${taskId}`;

      this.logger.log(
        `Sending assignee change notifications to ${recipients.length} recipients for task "${taskTitle}"`,
      );

      // Send notifications to each recipient
      await Promise.allSettled(
        recipients.map(async (recipient) => {
          const isUnsubscribed = await isUserUnsubscribed(
            db,
            recipient.email,
            'taskAssignments',
            organizationId,
          );

          if (isUnsubscribed) {
            this.logger.log(
              `Skipping notification: user ${recipient.email} is unsubscribed from task assignments`,
            );
            return;
          }

          // Send email notification
          try {
            const { id } = await sendEmail({
              to: recipient.email,
              subject: `Task "${taskTitle}" reassigned to ${newAssigneeName}`,
              react: TaskAssigneeChangedEmail({
                toName: recipient.name,
                toEmail: recipient.email,
                taskTitle,
                oldAssigneeName,
                newAssigneeName,
                changedByName,
                organizationName,
                taskUrl,
              }),
              system: true,
            });

            this.logger.log(
              `Assignee change email sent to ${recipient.email} (ID: ${id})`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to send assignee change email to ${recipient.email}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }

          // Send in-app notification
          try {
            const title = `Task reassigned`;
            const message = `${changedByName} reassigned "${taskTitle}" from ${oldAssigneeName} to ${newAssigneeName} in ${organizationName}`;

            await this.novuService.trigger({
              workflowId: TASK_WORKFLOW_ID,
              subscriberId: `${recipient.id}-${organizationId}`,
              email: recipient.email,
              payload: {
                title,
                message,
                url: taskUrl,
              },
            });

            this.logger.log(
              `[NOVU] Assignee change in-app notification sent to ${recipient.id}`,
            );
          } catch (error) {
            this.logger.error(
              `[NOVU] Failed to send assignee change in-app notification to ${recipient.id}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        'Failed to send assignee change notifications',
        error as Error,
      );
    }
  }
}
