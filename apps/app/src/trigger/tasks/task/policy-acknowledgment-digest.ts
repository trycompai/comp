import { db } from '@db/server';
import { logger, schedules } from '@trigger.dev/sdk';

import { filterComplianceMembers } from '@/lib/compliance';
import { PolicyAcknowledgmentDigestEmail } from '@trycompai/email';
import { isUserUnsubscribed } from '@trycompai/email/lib/check-unsubscribe';

import { sendEmailViaApi } from '../../lib/send-email-via-api';
import {
  computePendingPolicies,
  type DigestMember,
} from './policy-acknowledgment-digest-helpers';

const getPortalBase = () =>
  process.env.NEXT_PUBLIC_PORTAL_URL ?? 'https://portal.trycomp.ai';

export const policyAcknowledgmentDigest = schedules.task({
  id: 'policy-acknowledgment-digest',
  machine: 'large-1x',
  cron: '0 14 * * *', // Once daily at 14:00 UTC
  maxDuration: 1000 * 60 * 15, // 15 minutes
  run: async () => {
    const organizations = await db.organization.findMany({
      where: {
        policies: {
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
        policies: {
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
    let orgsProcessed = 0;

    for (const org of organizations) {
      orgsProcessed += 1;
      const complianceMembers = await filterComplianceMembers<DigestMember>(
        org.members,
        org.id,
      );

      if (complianceMembers.length === 0) continue;

      const sends: Promise<unknown>[] = [];

      for (const member of complianceMembers) {
        const unsubscribed = await isUserUnsubscribed(
          db,
          member.user.email,
          'policyNotifications',
          org.id,
        );
        if (unsubscribed) {
          logger.debug('User unsubscribed from policy notifications, skipping', {
            email: member.user.email,
            orgId: org.id,
          });
          continue;
        }

        const pending = computePendingPolicies(member, org.policies);
        if (pending.length === 0) continue;

        const policies = pending.map((p) => ({
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

        sends.push(
          sendEmailViaApi({
            to: member.user.email,
            subject,
            organizationId: org.id,
            react: emailElement!,
          }),
        );
      }

      const results = await Promise.allSettled(sends);
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

    logger.info('Digest complete', { orgsProcessed, emailsSent, emailsFailed });

    return { success: true, orgsProcessed, emailsSent, emailsFailed };
  },
});
