import { db } from '@db';
import { randomBytes } from 'crypto';
import { parseRoles } from '../people/utils/role-authorization';
import type { TrustEmailService } from './email.service';
import type { TrustAccessSubmission } from './trust-access-submission';
import { trustAccessRecipientKey } from './trust-access-submission';
import { buildTrustPortalAccessUrl } from './trust-access-url';

type SubmissionEmails = Pick<
  TrustEmailService,
  'sendAccessReclaimEmail' | 'sendAccessRequestNotification'
>;

/** Called only by the recipient-serialized Trigger task, never by HTTP handlers. */
export async function processTrustAccessSubmissionPayload(params: {
  payload: TrustAccessSubmission;
  runId: string;
  emailService: SubmissionEmails;
}): Promise<void> {
  const { payload, runId, emailService } = params;
  const trust = await db.trust.findFirst({
    where: { organizationId: payload.organizationId, status: 'published' },
    include: { organization: { select: { name: true } } },
  });
  // Publishing may have changed after enqueue. A worker must not recreate or
  // expose an unpublished portal, regardless of the submission's earlier state.
  if (!trust) return;

  const grant = await db.trustAccessGrant.findFirst({
    where: {
      subjectEmail: { equals: payload.email, mode: 'insensitive' },
      status: 'active',
      expiresAt: { gt: new Date() },
      accessRequest: { organizationId: trust.organizationId },
    },
    include: { accessRequest: { select: { name: true } } },
  });

  if (grant) {
    let accessToken = grant.accessToken;
    if (
      !accessToken ||
      !grant.accessTokenExpiresAt ||
      grant.accessTokenExpiresAt < new Date()
    ) {
      accessToken = randomBytes(32).toString('base64url').slice(0, 32);
      await db.trustAccessGrant.update({
        where: { id: grant.id },
        data: { accessToken, accessTokenExpiresAt: grant.expiresAt },
      });
    }
    const accessLink = await buildTrustPortalAccessUrl({
      organizationId: trust.organizationId,
      accessToken,
      query: payload.kind === 'reclaim' ? payload.query : undefined,
    });
    await emailService.sendAccessReclaimEmail({
      toEmail: grant.subjectEmail,
      toName: grant.accessRequest.name,
      organizationName: trust.organization.name,
      accessLink,
      expiresAt: grant.expiresAt,
      idempotencyKey: `trust-access-email:${runId}`,
    });
    return;
  }

  if (payload.kind === 'reclaim') return;

  const pending = await db.trustAccessRequest.findFirst({
    where: {
      organizationId: trust.organizationId,
      email: { equals: payload.email, mode: 'insensitive' },
      status: 'under_review',
    },
  });
  const request =
    pending ??
    (await db.trustAccessRequest.create({
      data: {
        organizationId: trust.organizationId,
        ...payload.request,
        email: payload.email,
        status: 'under_review',
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      },
    }));

  const members = trust.contactEmail
    ? []
    : await db.member.findMany({
        where: {
          organizationId: trust.organizationId,
          isActive: true,
          deactivated: false,
        },
        select: { role: true, user: { select: { email: true } } },
      });
  const recipients = trust.contactEmail
    ? [trust.contactEmail]
    : members
        .filter((member) =>
          parseRoles(member.role).some(
            (role) => role === 'owner' || role === 'admin',
          ),
        )
        .map((member) => member.user.email);

  for (const toEmail of new Set(recipients)) {
    // Retrying after request creation reuses the pending row and this key.
    // Trigger email deduplication prevents repeat notices after partial failure.
    const recipientKey = trustAccessRecipientKey({
      organizationId: trust.organizationId,
      email: toEmail,
    });
    await emailService.sendAccessRequestNotification({
      toEmail,
      organizationName: trust.organization.name,
      requesterName: request.name,
      requesterEmail: request.email,
      requesterCompany: request.company,
      requesterJobTitle: request.jobTitle,
      purpose: request.purpose,
      requestedDurationDays: request.requestedDurationDays,
      reviewUrl: `${process.env.BETTER_AUTH_URL}/${trust.organizationId}/trust/access-requests`,
      idempotencyKey: `trust-request-notification:${request.id}:${recipientKey}`,
    });
  }
}
