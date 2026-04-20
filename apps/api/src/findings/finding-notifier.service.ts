import { db, FindingArea, FindingStatus, FindingType } from '@db';
import { Injectable, Logger } from '@nestjs/common';
import { isUserUnsubscribed } from '@trycompai/email';
import { toExternalEvidenceFormType } from '@trycompai/company';
import { triggerEmail } from '../email/trigger-email';
import { FindingNotificationEmail } from '../email/templates/finding-notification';
import { NovuService } from '../notifications/novu.service';

const FINDING_WORKFLOW_ID = 'finding-notification';
const EMAIL_CONTENT_MAX_LENGTH = 200;
const NOVU_CONTENT_MAX_LENGTH = 100;

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

// Lightweight projection of the Finding + target relations the notifier needs.
export interface FindingForNotification {
  id: string;
  type: FindingType;
  content: string;
  area: FindingArea | null;
  taskId: string | null;
  evidenceSubmissionId: string | null;
  evidenceFormType: string | null;
  policyId: string | null;
  vendorId: string | null;
  riskId: string | null;
  memberId: string | null;
  deviceId: string | null;
  createdById: string | null;
  task?: { id: string; title: string } | null;
  evidenceSubmission?: {
    id: string;
    formType: string;
    submittedById?: string | null;
  } | null;
  policy?: { id: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  risk?: { id: string; title: string } | null;
  member?: { id: string; user: { id: string; name: string | null; email: string } } | null;
  device?: { id: string; name: string; hostname: string } | null;
}

interface TriggerParams {
  organizationId: string;
  finding: FindingForNotification;
  actorUserId: string;
  actorName: string;
}

interface SendParams extends TriggerParams {
  action: FindingAction;
  recipients: Recipient[];
  subject: string;
  heading: string;
  message: string;
  newStatus?: FindingStatus;
}

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

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.substring(0, n)}...`;
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    'https://app.trycomp.ai'
  );
}

/**
 * Convert a DB evidence form-type value (e.g. `board_meeting`) to its external
 * form (`board-meeting`). Callers pass the raw DB column value through as a
 * `string`, so we cast through `unknown` to the typed helper.
 */
function normalizeFormType(formType: string | null | undefined): string | null {
  if (!formType) return null;
  const external = toExternalEvidenceFormType(
    formType as unknown as Parameters<typeof toExternalEvidenceFormType>[0],
  );
  return external ?? formType;
}

/** Short label describing what the finding is about. */
function findingLabel(f: FindingForNotification): string {
  if (f.task) return f.task.title;
  if (f.policy) return `Policy: ${f.policy.name}`;
  if (f.vendor) return `Vendor: ${f.vendor.name}`;
  if (f.risk) return `Risk: ${f.risk.title}`;
  if (f.member) return `Person: ${f.member.user.name ?? f.member.user.email}`;
  if (f.device) return `Device: ${f.device.name || f.device.hostname}`;
  if (f.evidenceSubmission)
    return `Document: ${normalizeFormType(f.evidenceSubmission.formType) ?? f.evidenceSubmission.formType}`;
  if (f.evidenceFormType)
    return `Document: ${normalizeFormType(f.evidenceFormType) ?? f.evidenceFormType}`;
  if (f.area) return `Area: ${f.area}`;
  return 'Finding';
}

/** Noun used in sentence-building. */
function findingNoun(f: FindingForNotification): string {
  if (f.taskId) return 'task';
  if (f.policyId) return 'policy';
  if (f.vendorId) return 'vendor';
  if (f.riskId) return 'risk';
  if (f.memberId) return 'person';
  if (f.deviceId) return 'device';
  if (f.evidenceSubmissionId || f.evidenceFormType) return 'document submission';
  return 'area';
}

/** Deep-link the recipient into the Findings page with the finding sheet pre-opened. */
function buildFindingDeepLink(
  organizationId: string,
  findingId: string,
): string {
  return `${getAppUrl()}/${organizationId}/overview/findings?open=${findingId}`;
}

@Injectable()
export class FindingNotifierService {
  private readonly logger = new Logger(FindingNotifierService.name);

  constructor(private readonly novuService: NovuService) {}

  async notifyFindingCreated(params: TriggerParams): Promise<void> {
    const { finding, actorName } = params;
    const recipients = await this.resolveRecipients(params);
    if (recipients.length === 0) {
      this.logger.log('No recipients for finding created notification');
      return;
    }
    const label = findingLabel(finding);
    const noun = findingNoun(finding);

    await this.sendNotifications({
      ...params,
      action: 'created',
      recipients,
      subject: `New finding on ${noun}: ${label}`,
      heading: 'New Finding Created',
      message: `${actorName} created a new ${TYPE_LABELS[finding.type]} finding on the ${noun} "${label}".`,
    });
  }

  async notifyStatusChanged(
    params: TriggerParams & { newStatus: FindingStatus },
  ): Promise<void> {
    if (params.newStatus === FindingStatus.open) return;

    if (params.newStatus === FindingStatus.ready_for_review) {
      // When a finding was created by a platform admin, `createdById` (which
      // references a Member row) is null and `createdByAdminId` is set instead.
      // Platform admins don't belong to the org and can't receive org-scoped
      // notifications, so fall back to notifying org owners/admins so the
      // review can still be actioned on.
      const recipients = params.finding.createdById
        ? await this.getFindingCreator(
            params.finding.createdById,
            params.actorUserId,
          )
        : await this.getOwnersAndAdmins(
            params.organizationId,
            params.actorUserId,
          );
      if (recipients.length === 0) return;
      const label = findingLabel(params.finding);
      await this.sendNotifications({
        ...params,
        action: 'ready_for_review',
        recipients,
        subject: `Finding ready for review: ${label}`,
        heading: 'Finding Ready for Review',
        message: `${params.actorName} marked a finding on "${label}" as ready for your review.`,
      });
      return;
    }

    const recipients = await this.resolveRecipients(params);
    if (recipients.length === 0) return;
    const label = findingLabel(params.finding);

    if (params.newStatus === FindingStatus.needs_revision) {
      await this.sendNotifications({
        ...params,
        action: 'needs_revision',
        recipients,
        subject: `Finding needs revision: ${label}`,
        heading: 'Finding Needs Revision',
        message: `${params.actorName} reviewed a finding on "${label}" and marked it as needing revision.`,
      });
    } else if (params.newStatus === FindingStatus.closed) {
      await this.sendNotifications({
        ...params,
        action: 'closed',
        recipients,
        subject: `Finding closed: ${label}`,
        heading: 'Finding Closed',
        message: `${params.actorName} closed a finding on "${label}". The issue has been resolved.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Sending
  // --------------------------------------------------------------------------

  private async sendNotifications(params: SendParams): Promise<void> {
    const { organizationId, finding, action, recipients, subject, heading, message, newStatus } =
      params;

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const organizationName = organization?.name ?? 'your organization';

    const label = findingLabel(finding);
    const url = buildFindingDeepLink(organizationId, finding.id);
    const typeLabel = TYPE_LABELS[finding.type];
    const statusLabel = newStatus ? STATUS_LABELS[newStatus] : undefined;

    await Promise.allSettled(
      recipients.map((recipient) =>
        this.sendToRecipient({
          recipient,
          organizationId,
          organizationName,
          findingId: finding.id,
          taskId: finding.taskId ?? undefined,
          taskTitle: label,
          findingContent: finding.content,
          findingType: typeLabel,
          action,
          subject,
          heading,
          message,
          newStatus: statusLabel,
          findingUrl: url,
        }),
      ),
    );
  }

  private async sendToRecipient(params: {
    recipient: Recipient;
    organizationId: string;
    organizationName: string;
    findingId: string;
    taskId?: string;
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
    const { recipient, organizationId, subject, action } = params;

    try {
      const isUnsubscribed = await isUserUnsubscribed(
        db,
        recipient.email,
        'findingNotifications',
        organizationId,
      );

      if (isUnsubscribed) {
        this.logger.log(`Skipping notification: ${recipient.email} unsubscribed`);
        return;
      }

      this.logger.log(`Sending ${action} notification to ${recipient.email}`);

      await Promise.allSettled([
        triggerEmail({
          to: recipient.email,
          subject,
          react: FindingNotificationEmail({
            toName: recipient.name,
            toEmail: recipient.email,
            heading: params.heading,
            message: params.message,
            taskTitle: params.taskTitle,
            organizationName: params.organizationName,
            findingType: params.findingType,
            findingContent: truncate(
              params.findingContent,
              EMAIL_CONTENT_MAX_LENGTH,
            ),
            newStatus: params.newStatus,
            findingUrl: params.findingUrl,
          }),
          system: true,
        }),
        this.novuService.trigger({
          workflowId: FINDING_WORKFLOW_ID,
          subscriberId: `${recipient.userId}-${organizationId}`,
          email: recipient.email,
          payload: {
            action,
            heading: params.heading,
            message: params.message,
            findingId: params.findingId,
            taskId: params.taskId,
            taskTitle: params.taskTitle,
            organizationName: params.organizationName,
            findingType: params.findingType,
            findingContent: truncate(
              params.findingContent,
              NOVU_CONTENT_MAX_LENGTH,
            ),
            newStatus: params.newStatus,
            organizationId,
            findingUrl: params.findingUrl,
          },
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${recipient.email}:`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  // --------------------------------------------------------------------------
  // Recipient resolution
  // --------------------------------------------------------------------------

  /** Resolve recipients per target type: assignee/owner for the target entity + org admins. */
  private async resolveRecipients(args: TriggerParams): Promise<Recipient[]> {
    const { organizationId, actorUserId, finding } = args;

    if (finding.taskId) {
      return this.getTaskRecipients(organizationId, finding.taskId, actorUserId);
    }
    if (finding.memberId && finding.member) {
      return this.includeAdmins(
        organizationId,
        actorUserId,
        finding.member.user.id,
      );
    }
    if (finding.deviceId && finding.device) {
      const device = await db.device.findUnique({
        where: { id: finding.deviceId },
        select: { member: { select: { userId: true } } },
      });
      return this.includeAdmins(
        organizationId,
        actorUserId,
        device?.member.userId ?? null,
      );
    }
    if (finding.policyId) {
      const policy = await db.policy.findUnique({
        where: { id: finding.policyId },
        select: { assignee: { select: { userId: true } } },
      });
      return this.includeAdmins(
        organizationId,
        actorUserId,
        policy?.assignee?.userId ?? null,
      );
    }
    if (finding.vendorId) {
      const vendor = await db.vendor.findUnique({
        where: { id: finding.vendorId },
        select: { assignee: { select: { userId: true } } },
      });
      return this.includeAdmins(
        organizationId,
        actorUserId,
        vendor?.assignee?.userId ?? null,
      );
    }
    if (finding.riskId) {
      const risk = await db.risk.findUnique({
        where: { id: finding.riskId },
        select: { assignee: { select: { userId: true } } },
      });
      return this.includeAdmins(
        organizationId,
        actorUserId,
        risk?.assignee?.userId ?? null,
      );
    }
    if (finding.evidenceSubmissionId || finding.evidenceFormType) {
      return this.getSubmissionRecipients(
        organizationId,
        finding.evidenceSubmissionId,
        finding.evidenceSubmission?.submittedById ?? null,
        actorUserId,
      );
    }
    return this.getOwnersAndAdmins(organizationId, actorUserId);
  }

  private async getOwnersAndAdmins(
    organizationId: string,
    excludeUserId: string,
  ): Promise<Recipient[]> {
    try {
      const members = await db.member.findMany({
        where: { organizationId, deactivated: false },
        select: {
          role: true,
          user: { select: { id: true, email: true, name: true } },
        },
      });
      const admins = members.filter(
        (m) => m.role.includes('admin') || m.role.includes('owner'),
      );
      return this.dedupe(admins, excludeUserId);
    } catch (error) {
      this.logger.error('Failed to resolve owners/admins:', error);
      return [];
    }
  }

  private async includeAdmins(
    organizationId: string,
    excludeUserId: string,
    primaryUserId: string | null,
  ): Promise<Recipient[]> {
    const admins = await this.getOwnersAndAdmins(organizationId, excludeUserId);
    if (!primaryUserId || primaryUserId === excludeUserId) return admins;

    const already = admins.some((a) => a.userId === primaryUserId);
    if (already) return admins;

    // Only include the primary recipient if they're still an active member
    // of this organization. `getOwnersAndAdmins` already filters on
    // `deactivated: false`; we apply the same filter here so deactivated
    // assignees (e.g. an old task owner who's since left the org) aren't
    // emailed about new findings on their former targets.
    const member = await db.member.findFirst({
      where: {
        organizationId,
        userId: primaryUserId,
        deactivated: false,
        isActive: true,
      },
      select: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    const user = member?.user;
    if (!user || !user.email) return admins;

    return [
      {
        userId: user.id,
        email: user.email,
        name: user.name || user.email,
      },
      ...admins,
    ];
  }

  /**
   * Task-finding recipients: org owners + admins + the task's assignee.
   * Mirrors the policy/vendor/risk/device branches so that finding content
   * is only disclosed to stakeholders of that specific target, not fanned
   * out to every active member of the org.
   */
  private async getTaskRecipients(
    organizationId: string,
    taskId: string,
    excludeUserId: string,
  ): Promise<Recipient[]> {
    try {
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { assignee: { select: { userId: true } } },
      });
      return this.includeAdmins(
        organizationId,
        excludeUserId,
        task?.assignee?.userId ?? null,
      );
    } catch (error) {
      this.logger.error('Failed to resolve task recipients:', error);
      return [];
    }
  }

  private async getSubmissionRecipients(
    organizationId: string,
    evidenceSubmissionId: string | null,
    submitterUserId: string | null,
    excludeUserId: string,
  ): Promise<Recipient[]> {
    try {
      const admins = await this.getOwnersAndAdmins(organizationId, excludeUserId);
      const added = new Set(admins.map((r) => r.userId));
      const recipients: Recipient[] = [];

      let submitter: { id: string; email: string; name: string | null } | null = null;
      if (submitterUserId) {
        submitter = await db.user.findUnique({
          where: { id: submitterUserId },
          select: { id: true, email: true, name: true },
        });
      } else if (evidenceSubmissionId) {
        const submission = await db.evidenceSubmission.findUnique({
          where: { id: evidenceSubmissionId },
          select: {
            submittedBy: { select: { id: true, email: true, name: true } },
          },
        });
        submitter = submission?.submittedBy ?? null;
      }

      if (
        submitter &&
        submitter.id !== excludeUserId &&
        submitter.email &&
        !added.has(submitter.id)
      ) {
        recipients.push({
          userId: submitter.id,
          email: submitter.email,
          name: submitter.name || submitter.email,
        });
      }
      return [...recipients, ...admins];
    } catch (error) {
      this.logger.error('Failed to resolve submission recipients:', error);
      return [];
    }
  }

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
          { userId: user.id, email: user.email, name: user.name || user.email },
        ];
      }
      return [];
    } catch (error) {
      this.logger.error('Failed to resolve finding creator:', error);
      return [];
    }
  }

  private dedupe(
    members: { user: { id: string; email: string | null; name: string | null } }[],
    excludeUserId: string,
  ): Recipient[] {
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const m of members) {
      const u = m.user;
      if (u.id === excludeUserId || !u.email || seen.has(u.id)) continue;
      seen.add(u.id);
      out.push({ userId: u.id, email: u.email, name: u.name || u.email });
    }
    return out;
  }
}
