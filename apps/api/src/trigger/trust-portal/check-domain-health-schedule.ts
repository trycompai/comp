import { db } from '@db';
import { logger, schedules } from '@trigger.dev/sdk';
import { TrustEmailService } from '../../trust-portal/email.service';

const emailService = new TrustEmailService();

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.trycomp.ai';

/**
 * Checks domain config via the Vercel API. Returns null when Vercel is not
 * configured on this server (dev/self-host) — callers should skip the check.
 */
async function isDomainMisconfigured(
  domain: string,
): Promise<boolean | null> {
  const teamId = process.env.VERCEL_TEAM_ID;
  const vercelToken = process.env.VERCEL_AUTH_TOKEN;

  if (!teamId || !vercelToken) {
    return null;
  }

  const url = new URL(
    `https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config`,
  );
  url.searchParams.set('teamId', teamId);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${vercelToken}` },
  });

  if (!res.ok) {
    logger.warn(`Vercel config check failed for ${domain}`, {
      status: res.status,
    });
    return null;
  }

  const data = (await res.json()) as { misconfigured?: boolean };
  return data.misconfigured === true;
}

/**
 * Daily health check for Trust Portal custom domains.
 *
 * Iterates all orgs with a verified custom domain, re-checks Vercel's
 * `misconfigured` flag, and — when a domain is broken — marks it unverified
 * in the DB and emails the org's admin/owner members so they can act.
 *
 * Runs at 6:00 AM UTC daily.
 */
export const checkDomainHealthSchedule = schedules.task({
  id: 'trust-portal-check-domain-health',
  cron: '0 6 * * *',
  maxDuration: 60 * 15, // 15 minutes
  run: async (payload) => {
    logger.info('Starting Trust Portal domain health check', {
      scheduledAt: payload.timestamp,
    });

    const trusts = await db.trust.findMany({
      where: {
        domain: { not: null },
        domainVerified: true,
      },
      select: {
        organizationId: true,
        domain: true,
        organization: {
          select: {
            name: true,
            members: {
              where: { isActive: true },
              select: {
                role: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${trusts.length} trusts with verified custom domains`);

    const vercelConfigured =
      !!process.env.VERCEL_TEAM_ID &&
      !!process.env.VERCEL_AUTH_TOKEN;

    if (!vercelConfigured) {
      logger.info(
        'Skipping domain health check — Vercel not configured on this server',
      );
      return { checked: 0, misconfigured: 0, notified: 0 };
    }

    let checked = 0;
    let misconfigured = 0;
    let notified = 0;

    for (const trust of trusts) {
      const domain = trust.domain!;
      checked++;

      const broken = await isDomainMisconfigured(domain);

      if (broken === null) {
        logger.warn(`Skipping domain ${domain} — Vercel API request failed`);
        continue;
      }

      if (!broken) {
        continue;
      }

      misconfigured++;
      logger.warn(`Domain misconfigured: ${domain}`, {
        organizationId: trust.organizationId,
      });

      await db.trust.update({
        where: { organizationId: trust.organizationId },
        data: { domainVerified: false },
      });

      const adminOrOwnerMembers = trust.organization.members.filter(
        (m) =>
          m.role &&
          (m.role.includes('owner') || m.role.includes('admin')) &&
          m.user?.email,
      );

      const settingsUrl = `${APP_BASE_URL}/${trust.organizationId}/trust/portal-settings`;

      for (const member of adminOrOwnerMembers) {
        if (!member.user?.email) continue;

        try {
          await emailService.sendDomainMisconfiguredEmail({
            toEmail: member.user.email,
            toName:
              member.user.name?.trim() || member.user.email,
            organizationName: trust.organization.name,
            domain,
            settingsUrl,
          });
          notified++;
        } catch (err) {
          logger.error(
            `Failed to send domain misconfigured email to ${member.user.email}`,
            { error: err instanceof Error ? err.message : String(err) },
          );
        }
      }
    }

    logger.info('Trust Portal domain health check complete', {
      checked,
      misconfigured,
      notified,
    });

    return { checked, misconfigured, notified };
  },
});
