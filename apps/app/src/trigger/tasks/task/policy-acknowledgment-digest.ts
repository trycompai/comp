import { db } from '@db/server';
import { logger, schedules } from '@trigger.dev/sdk';

import {
  PolicyAcknowledgmentDigestEmail,
  computePolicyAcknowledgmentDigestSubject,
  type PolicyAcknowledgmentDigestOrg,
} from '@trycompai/email';
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
// Skip orgs that look abandoned — same threshold weekly-task-reminder uses so
// we don't keep hitting dead addresses and burning domain reputation.
const ORG_INACTIVITY_DAYS = 90;

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

interface RollupEntry {
  email: string;
  userName: string;
  // First org (in iteration order) a policy was added for this user — used
  // as the x-organization-id header when sending. The body lists all orgs.
  primaryOrgId: string;
  orgs: PolicyAcknowledgmentDigestOrg[];
}

export const policyAcknowledgmentDigest = schedules.task({
  id: 'policy-acknowledgment-digest',
  machine: 'large-1x',
  cron: '0 14 * * *', // Once daily at 14:00 UTC
  maxDuration: 1000 * 60 * 15, // 15 minutes
  run: async () => {
    const inactivityCutoff = new Date();
    inactivityCutoff.setDate(
      inactivityCutoff.getDate() - ORG_INACTIVITY_DAYS,
    );

    const organizations = await db.organization.findMany({
      where: {
        hasAccess: true,
        onboardingCompleted: true,
        policy: {
          some: {
            status: 'published',
            isArchived: false,
            isRequiredToSign: true,
          },
        },
        members: {
          some: {
            deactivated: false,
            user: {
              sessions: {
                some: { updatedAt: { gte: inactivityCutoff } },
              },
            },
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
      `Checking ${organizations.length} active orgs for pending acknowledgments (skipped orgs with no sessions in ${ORG_INACTIVITY_DAYS} days)`,
    );

    const portalBase = getPortalBase();
    let orgsProcessed = 0;
    // Per-org drops from the unsubscribe filter. A user opted-out in 2 orgs
    // counts 2 — same semantic as the pre-rollup implementation.
    let orgsSkippedUnsubscribed = 0;

    // Rollup across orgs, keyed by user id so one person = one email even
    // when they hold separate member records in multiple organizations.
    const rollup = new Map<string, RollupEntry>();

    for (const org of organizations) {
      orgsProcessed += 1;
      const complianceMembers = await filterDigestMembersByCompliance(
        db as unknown as ComplianceFilterDb,
        org.members,
        org.id,
      );

      if (complianceMembers.length === 0) continue;

      const pendingByMember: Array<{
        member: DigestMember;
        policies: PolicyAcknowledgmentDigestOrg['policies'];
      }> = [];

      for (const member of complianceMembers) {
        const pendingPolicies = computePendingPolicies(member, org.policy);
        if (pendingPolicies.length === 0) continue;

        pendingByMember.push({
          member,
          policies: pendingPolicies.map((p) => ({
            id: p.id,
            name: p.name,
            url: `${portalBase}/${org.id}/policy/${p.id}`,
          })),
        });
      }

      if (pendingByMember.length === 0) continue;

      // One unsubscribe query per org, batched across members.
      const emailsWithPending = pendingByMember.map(
        (p) => p.member.user.email,
      );
      const unsubscribedEmails = await getUnsubscribedEmails(
        db,
        emailsWithPending,
        'policyNotifications',
        org.id,
      );

      for (const { member, policies } of pendingByMember) {
        if (unsubscribedEmails.has(member.user.email)) {
          logger.debug(
            'User unsubscribed from policy notifications for this org, omitting from digest',
            { email: member.user.email, orgId: org.id },
          );
          orgsSkippedUnsubscribed += 1;
          continue;
        }

        const existing = rollup.get(member.user.id);
        if (existing) {
          existing.orgs.push({ id: org.id, name: org.name, policies });
        } else {
          rollup.set(member.user.id, {
            email: member.user.email,
            userName: member.user.name ?? '',
            primaryOrgId: org.id,
            orgs: [{ id: org.id, name: org.name, policies }],
          });
        }
      }
    }

    // Build one send per user.
    const sends: Array<() => Promise<unknown>> = [];
    for (const entry of rollup.values()) {
      const subject = computePolicyAcknowledgmentDigestSubject(entry.orgs);
      const emailElement = PolicyAcknowledgmentDigestEmail({
        email: entry.email,
        userName: entry.userName,
        orgs: entry.orgs,
      });
      if (!emailElement) continue;

      sends.push(() =>
        sendEmailViaApi({
          to: entry.email,
          subject,
          organizationId: entry.primaryOrgId,
          react: emailElement,
        }),
      );
    }

    const results = await sendInBatches(sends);
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') emailsSent += 1;
      else {
        emailsFailed += 1;
        logger.warn('Digest email failed', {
          error:
            r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }

    logger.info('Digest complete', {
      orgsProcessed,
      recipients: rollup.size,
      emailsSent,
      emailsFailed,
      orgsSkippedUnsubscribed,
    });

    return {
      success: true,
      orgsProcessed,
      recipients: rollup.size,
      emailsSent,
      emailsFailed,
      orgsSkippedUnsubscribed,
    };
  },
});
