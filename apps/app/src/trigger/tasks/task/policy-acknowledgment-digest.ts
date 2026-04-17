import { db } from '@db/server';
import { logger, schedules } from '@trigger.dev/sdk';

import { PolicyAcknowledgmentDigestEmail } from '@trycompai/email';
import { getUnsubscribedEmails } from '@trycompai/email/lib/check-unsubscribe';

import { sendEmailViaApi } from '../../lib/send-email-via-api';
import {
  computePendingPolicies,
  filterDigestMembersByCompliance,
  type ComplianceFilterDb,
  type DigestMember,
} from './policy-acknowledgment-digest-helpers';

const getPortalBase = () =>
  (process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai').replace(
    /\/+$/,
    '',
  );

const EMAIL_BATCH_SIZE = 25;

async function sendInBatches<T>(
  sends: Array<() => Promise<T>>,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < sends.length; i += EMAIL_BATCH_SIZE) {
    const chunk = sends.slice(i, i + EMAIL_BATCH_SIZE);
    const chunkResults = await Promise.allSettled(chunk.map((fn) => fn()));
    results.push(...chunkResults);
  }
  return results;
}

export const policyAcknowledgmentDigest = schedules.task({
  id: 'policy-acknowledgment-digest',
  machine: 'large-1x',
  cron: '0 14 * * *', // Once daily at 14:00 UTC
  maxDuration: 1000 * 60 * 15, // 15 minutes
  run: async () => {
    const organizations = await db.organization.findMany({
      where: {
        policy: {
          some: {
            status: 'published',
            isArchived: false,
            isRequiredToSign: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        policy: {
          where: {
            status: 'published',
            isArchived: false,
            isRequiredToSign: true,
          },
          select: {
            id: true,
            name: true,
            signedBy: true,
            visibility: true,
            visibleToDepartments: true,
          },
        },
        members: {
          where: { deactivated: false },
          select: {
            id: true,
            role: true,
            department: true,
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    logger.info(
      `Checking ${organizations.length} orgs for pending acknowledgments`,
    );

    const portalBase = getPortalBase();
    let emailsSent = 0;
    let emailsFailed = 0;
    let emailsSkippedUnsubscribed = 0;
    let orgsProcessed = 0;

    for (const org of organizations) {
      orgsProcessed += 1;
      const complianceMembers = await filterDigestMembersByCompliance(
        db as unknown as ComplianceFilterDb,
        org.members,
        org.id,
      );

      if (complianceMembers.length === 0) continue;

      // Compute pending policies for each member first (no sends yet)
      type PendingEntry = {
        member: DigestMember;
        policies: Array<{ id: string; name: string; url: string }>;
        subject: string;
        emailElement: ReturnType<typeof PolicyAcknowledgmentDigestEmail>;
      };

      const pending: PendingEntry[] = [];
      const emailsWithPending: string[] = [];

      for (const member of complianceMembers) {
        const pendingPolicies = computePendingPolicies(member, org.policy);
        if (pendingPolicies.length === 0) continue;

        const policies = pendingPolicies.map((p) => ({
          id: p.id,
          name: p.name,
          url: `${portalBase}/${org.id}/policy/${p.id}`,
        }));
        const countLabel =
          policies.length === 1 ? '1 policy' : `${policies.length} policies`;
        const subject = `You have ${countLabel} to review at ${org.name}`;

        const emailElement = PolicyAcknowledgmentDigestEmail({
          email: member.user.email,
          userName: member.user.name ?? '',
          organizationName: org.name,
          organizationId: org.id,
          policies,
        });

        emailsWithPending.push(member.user.email);
        pending.push({ member, policies, subject, emailElement });
      }

      if (pending.length === 0) continue;

      // Batch unsubscribe check — 3 DB queries total for this org
      const unsubscribedEmails = await getUnsubscribedEmails(
        db,
        emailsWithPending,
        'policyNotifications',
        org.id,
      );

      // Build thunks for subscribed members only
      const sends: Array<() => Promise<unknown>> = [];

      for (const entry of pending) {
        if (unsubscribedEmails.has(entry.member.user.email)) {
          logger.debug(
            'User unsubscribed from policy notifications, skipping',
            { email: entry.member.user.email, orgId: org.id },
          );
          emailsSkippedUnsubscribed += 1;
          continue;
        }

        sends.push(() =>
          sendEmailViaApi({
            to: entry.member.user.email,
            subject: entry.subject,
            organizationId: org.id,
            react: entry.emailElement!,
          }),
        );
      }

      const results = await sendInBatches(sends);
      for (const r of results) {
        if (r.status === 'fulfilled') emailsSent += 1;
        else {
          emailsFailed += 1;
          logger.warn('Digest email failed', {
            orgId: org.id,
            error:
              r.reason instanceof Error ? r.reason.message : String(r.reason),
          });
        }
      }
    }

    logger.info('Digest complete', {
      orgsProcessed,
      emailsSent,
      emailsFailed,
      emailsSkippedUnsubscribed,
    });

    return {
      success: true,
      orgsProcessed,
      emailsSent,
      emailsFailed,
      emailsSkippedUnsubscribed,
    };
  },
});
