import { db, FindingStatus, FindingType } from '@db';
import { Injectable, Logger } from '@nestjs/common';
import { isUserUnsubscribed } from '@trycompai/email';
import { sendEmail } from '../email/resend';
import { FindingNotificationEmail } from '../email/templates/finding-notification';
import { NovuService } from '../notifications/novu.service';

// ============================================================================
// Constants
// ============================================================================

const FINDING_WORKFLOW_ID = 'finding-notification';
const EMAIL_CONTENT_MAX_LENGTH = 200;
const NOVU_CONTENT_MAX_LENGTH = 100;

// ============================================================================
// Types
// ============================================================================

type FindingAction =
  | 'created'
  | 'ready_for_review'
  | 'needs_revision'
  | 'closed';

interface Recipient {
  userId: string;
  email: string;
  name: string;
}

interface NotificationParams {
  organizationId: string;
  findingId: string;
  taskId: string;
  taskTitle: string;
  findingContent: string;
  findingType: FindingType;
  actorUserId: string;
  actorName: string;
}

interface SendNotificationParams extends NotificationParams {
  action: FindingAction;
  recipients: Recipient[];
  subject: string;
  heading: string;
  message: string;
  newStatus?: FindingStatus;
}

// ============================================================================
// Label Maps
// ============================================================================

const STATUS_LABELS: Record<FindingStatus, string> = {
  [FindingStatus.open]: 'Open',
  [FindingStatus.ready_for_review]: 'Ready for Review',
  [FindingStatus.needs_revision]: 'Needs Revision',
  [FindingStatus.closed]: 'Closed',
};

const TYPE_LABELS: Record<FindingType, string> = {
  [FindingType.soc2]: 'SOC 2',
  [FindingType.iso27001]: 'ISO 27001',
};

// ============================================================================
// Helper Functions
// ============================================================================

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return `${content.substring(0, maxLength)}...`;
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'https://app.trycomp.ai'
  );
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class FindingNotifierService {
  private readonly logger = new Logger(FindingNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

  // ==========================================================================
  // Public Methods - Notification Triggers
  // ==========================================================================

  /**
   * Notify when a new finding is created.
   * Recipients: Task assignee + Organization admins/owners
   */
  async notifyFindingCreated(params: NotificationParams): Promise<void> {
    const {
      organizationId,
      taskId,
      taskTitle,
      findingType,
      actorUserId,
      actorName,
    } = params;

    const recipients = await this.getTaskAssigneeAndAdmins(
      organizationId,
      taskId,
      actorUserId,
    );

    if (recipients.length === 0) {
      this.logger.log('No recipients for finding created notification');
      return;
    }

    await this.sendNotifications({
      ...params,
      action: 'created',
      recipients,
      subject: `New finding on task: ${taskTitle}`,
      heading: 'New Finding Created',
      message: `${actorName} created a new ${TYPE_LABELS[findingType]} finding on the task "${taskTitle}".`,
    });
  }

  /**
   * Notify when status changes to Ready for Review.
   * Recipients: Finding creator (the auditor who raised it)
   */
  async notifyReadyForReview(
    params: NotificationParams & { findingCreatorMemberId: string },
  ): Promise<void> {
    const {
      findingId,
      taskTitle,
      actorUserId,
      actorName,
      findingCreatorMemberId,
    } = params;

    this.logger.log(
      `[notifyReadyForReview] Finding ${findingId}: Looking for creator (memberId: ${findingCreatorMemberId}), excluding actor (userId: ${actorUserId})`,
    );

    const recipients = await this.getFindingCreator(
      findingCreatorMemberId,
      actorUserId,
    );

    if (recipients.length === 0) {
      this.logger.warn(
        `[notifyReadyForReview] Finding ${findingId}: No recipients found. Creator memberId: ${findingCreatorMemberId}, Actor userId: ${actorUserId}`,
      );
      return;
    }

    this.logger.log(
      `[notifyReadyForReview] Finding ${findingId}: Sending to ${recipients.length} recipient(s): ${recipients.map((r) => r.email).join(', ')}`,
    );

    await this.sendNotifications({
      ...params,
      action: 'ready_for_review',
      recipients,
      subject: `Finding ready for review: ${taskTitle}`,
      heading: 'Finding Ready for Review',
      message: `${actorName} marked a finding on "${taskTitle}" as ready for your review.`,
      newStatus: FindingStatus.ready_for_review,
    });
  }

  /**
   * Notify when status changes to Needs Revision.
   * Recipients: Task assignee + Organization admins/owners
   */
  async notifyNeedsRevision(params: NotificationParams): Promise<void> {
    const { organizationId, taskId, taskTitle, actorUserId, actorName } =
      params;

    const recipients = await this.getTaskAssigneeAndAdmins(
      organizationId,
      taskId,
      actorUserId,
    );

    if (recipients.length === 0) {
      this.logger.log('No recipients for needs revision notification');
      return;
    }

    await this.sendNotifications({
      ...params,
      action: 'needs_revision',
      recipients,
      subject: `Finding needs revision: ${taskTitle}`,
      heading: 'Finding Needs Revision',
      message: `${actorName} reviewed a finding on "${taskTitle}" and marked it as needing revision.`,
      newStatus: FindingStatus.needs_revision,
    });
  }

  /**
   * Notify when finding is closed.
   * Recipients: Task assignee + Organization admins/owners
   */
  async notifyFindingClosed(params: NotificationParams): Promise<void> {
    const { organizationId, taskId, taskTitle, actorUserId, actorName } =
      params;

    const recipients = await this.getTaskAssigneeAndAdmins(
      organizationId,
      taskId,
      actorUserId,
    );

    if (recipients.length === 0) {
      this.logger.log('No recipients for finding closed notification');
      return;
    }

    await this.sendNotifications({
      ...params,
      action: 'closed',
      recipients,
      subject: `Finding closed: ${taskTitle}`,
      heading: 'Finding Closed',
      message: `${actorName} closed a finding on "${taskTitle}". The issue has been resolved.`,
      newStatus: FindingStatus.closed,
    });
  }

  // ==========================================================================
  // Private Methods - Core Logic
  // ==========================================================================

  /**
   * Send notifications to all recipients via email and in-app (Novu).
   * Failures are logged but don't throw - fire-and-forget pattern.
   */
  private async sendNotifications(
    params: SendNotificationParams,
  ): Promise<void> {
    const {
      organizationId,
      findingId,
      taskId,
      taskTitle,
      findingContent,
      findingType,
      action,
      recipients,
      subject,
      heading,
      message,
      newStatus,
    } = params;

    // Fetch organization name
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const organizationName = organization?.name ?? 'your organization';

    const findingUrl = `${getAppUrl()}/${organizationId}/tasks/${taskId}`;
    const typeLabel = TYPE_LABELS[findingType];
    const statusLabel = newStatus ? STATUS_LABELS[newStatus] : undefined;

    // Process each recipient
    await Promise.allSettled(
      recipients.map((recipient) =>
        this.sendToRecipient({
          recipient,
          organizationId,
          organizationName,
          findingId,
          taskId,
          taskTitle,
          findingContent,
          findingType: typeLabel,
          action,
          subject,
          heading,
          message,
          newStatus: statusLabel,
          findingUrl,
        }),
      ),
    );
  }

  /**
   * Send email and in-app notification to a single recipient.
   */
  private async sendToRecipient(params: {
    recipient: Recipient;
    organizationId: string;
    organizationName: string;
    findingId: string;
    taskId: string;
    taskTitle: string;
    findingContent: string;
    findingType: string;
    action: FindingAction;
    subject: string;
    heading: string;
    message: string;
    newStatus?: string;
    findingUrl: string;
  }): Promise<void> {
    const {
      recipient,
      organizationId,
      organizationName,
      findingId,
      taskId,
      taskTitle,
      findingContent,
      findingType,
      action,
      subject,
      heading,
      message,
      newStatus,
      findingUrl,
    } = params;

    try {
      // Check unsubscribe preferences
      const isUnsubscribed = await isUserUnsubscribed(
        db,
        recipient.email,
        'findingNotifications',
      );

      if (isUnsubscribed) {
        this.logger.log(
          `Skipping notification: ${recipient.email} is unsubscribed`,
        );
        return;
      }

      this.logger.log(`Sending ${action} notification to ${recipient.email}`);

      // Send email and in-app notifications in parallel
      await Promise.allSettled([
        this.sendEmailNotification({
          recipient,
          subject,
          heading,
          message,
          taskTitle,
          organizationName,
          findingType,
          findingContent: truncateContent(
            findingContent,
            EMAIL_CONTENT_MAX_LENGTH,
          ),
          newStatus,
          findingUrl,
        }),
        this.sendInAppNotification({
          recipient,
          organizationId,
          organizationName,
          findingId,
          taskId,
          taskTitle,
          findingType,
          findingContent: truncateContent(
            findingContent,
            NOVU_CONTENT_MAX_LENGTH,
          ),
          action,
          heading,
          message,
          newStatus,
          findingUrl,
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${recipient.email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Send email notification via Resend.
   */
  private async sendEmailNotification(params: {
    recipient: Recipient;
    subject: string;
    heading: string;
    message: string;
    taskTitle: string;
    organizationName: string;
    findingType: string;
    findingContent: string;
    newStatus?: string;
    findingUrl: string;
  }): Promise<void> {
    const {
      recipient,
      subject,
      heading,
      message,
      taskTitle,
      organizationName,
      findingType,
      findingContent,
      newStatus,
      findingUrl,
    } = params;

    try {
      const { id } = await sendEmail({
        to: recipient.email,
        subject,
        react: FindingNotificationEmail({
          toName: recipient.name,
          toEmail: recipient.email,
          heading,
          message,
          taskTitle,
          organizationName,
          findingType,
          findingContent,
          newStatus,
          findingUrl,
        }),
        system: true,
      });

      this.logger.log(`Email sent to ${recipient.email} (ID: ${id})`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipient.email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Send in-app notification via Novu.
   */
  private async sendInAppNotification(params: {
    recipient: Recipient;
    organizationId: string;
    organizationName: string;
    findingId: string;
    taskId: string;
    taskTitle: string;
    findingType: string;
    findingContent: string;
    action: FindingAction;
    heading: string;
    message: string;
    newStatus?: string;
    findingUrl: string;
  }): Promise<void> {
    const {
      recipient,
      organizationId,
      organizationName,
      findingId,
      taskId,
      taskTitle,
      findingType,
      findingContent,
      action,
      heading,
      message,
      newStatus,
      findingUrl,
    } = params;

    try {
      await this.novuService.trigger({
        workflowId: FINDING_WORKFLOW_ID,
        subscriberId: `${recipient.userId}-${organizationId}`,
        email: recipient.email,
        payload: {
          action,
          heading,
          message,
          findingId,
          taskId,
          taskTitle,
          organizationName,
          findingType,
          findingContent,
          newStatus,
          organizationId,
          findingUrl,
        },
      });

      this.logger.log(`[NOVU] In-app notification sent to ${recipient.userId}`);
    } catch (error) {
      this.logger.error(
        `[NOVU] Failed to send to ${recipient.userId}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  // ==========================================================================
  // Private Methods - Recipient Resolution
  // ==========================================================================

  /**
   * Get task assignee and organization admins/owners as recipients.
   * Excludes the actor (person who triggered the action).
   */
  private async getTaskAssigneeAndAdmins(
    organizationId: string,
    taskId: string,
    excludeUserId: string,
  ): Promise<Recipient[]> {
    try {
      // Fetch task assignee and org members in parallel
      const [task, allMembers] = await Promise.all([
        db.task.findUnique({
          where: { id: taskId },
          select: {
            assignee: {
              select: {
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        }),
        db.member.findMany({
          where: {
            organizationId,
            deactivated: false,
          },
          select: {
            role: true,
            user: { select: { id: true, email: true, name: true } },
          },
        }),
      ]);

      // Filter for admins/owners (roles can be comma-separated, e.g., "admin,auditor")
      const adminMembers = allMembers.filter(
        (member) =>
          member.role.includes('admin') || member.role.includes('owner'),
      );

      const recipients: Recipient[] = [];
      const addedUserIds = new Set<string>();

      // Add task assignee
      const assigneeUser = task?.assignee?.user;
      if (
        assigneeUser &&
        assigneeUser.id !== excludeUserId &&
        assigneeUser.email
      ) {
        recipients.push({
          userId: assigneeUser.id,
          email: assigneeUser.email,
          name: assigneeUser.name || assigneeUser.email,
        });
        addedUserIds.add(assigneeUser.id);
      }

      // Add org admins/owners (deduplicated)
      for (const member of adminMembers) {
        const user = member.user;
        if (
          user.id !== excludeUserId &&
          user.email &&
          !addedUserIds.has(user.id)
        ) {
          recipients.push({
            userId: user.id,
            email: user.email,
            name: user.name || user.email,
          });
          addedUserIds.add(user.id);
        }
      }

      return recipients;
    } catch (error) {
      this.logger.error(
        'Failed to get task assignee and admins:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return [];
    }
  }

  /**
   * Get the finding creator as recipient (for Ready for Review notifications).
   * Excludes the actor (person who triggered the action).
   */
  private async getFindingCreator(
    creatorMemberId: string,
    excludeUserId: string,
  ): Promise<Recipient[]> {
    try {
      const member = await db.member.findUnique({
        where: { id: creatorMemberId },
        select: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      const user = member?.user;
      if (user && user.id !== excludeUserId && user.email) {
        return [
          {
            userId: user.id,
            email: user.email,
            name: user.name || user.email,
          },
        ];
      }

      return [];
    } catch (error) {
      this.logger.error(
        'Failed to get finding creator:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      return [];
    }
  }
}
