import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { extractDomain, isPublicEmailDomain } from '../stripe/domain.utils';
import { StripeService } from '../stripe/stripe.service';

export type AutoApproveReason =
  | 'already-has-access'
  | 'self-hosted'
  | 'trycomp-email'
  | 'stripe-customer'
  | 'not-eligible';

export interface AutoApproveResult {
  hasAccess: boolean;
  autoApproved: boolean;
  reason: AutoApproveReason;
}

const isSelfHosted = (): boolean =>
  process.env.SELF_HOSTED === 'true' ||
  process.env.NEXT_PUBLIC_SELF_HOSTED === 'true';

@Injectable()
export class OrganizationAccessService {
  private readonly logger = new Logger(OrganizationAccessService.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Decide whether to grant `hasAccess` to the org for the given user, and
   * persist the flag if so. Membership is enforced upstream by HybridAuthGuard
   * (the auth guard rejects requests where the user isn't an active member of
   * the active organization), but we re-fetch the organization here for the
   * website + current hasAccess values.
   *
   * Decision rules (in order):
   *   1. Org already has access → no-op.
   *   2. Self-hosted instance → grant.
   *   3. User email at @trycomp.ai → grant (internal team).
   *   4. User email domain matches the org website domain AND that domain has
   *      an active Stripe customer → grant. Public mailbox domains are
   *      excluded.
   *   5. Otherwise → not eligible.
   */
  async autoApproveAccess(input: {
    organizationId: string;
    userEmail: string | undefined;
  }): Promise<AutoApproveResult> {
    const { organizationId, userEmail } = input;

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, hasAccess: true, website: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.hasAccess) {
      return {
        hasAccess: true,
        autoApproved: false,
        reason: 'already-has-access',
      };
    }

    if (isSelfHosted()) {
      await this.grantAccess(organizationId);
      this.logger.log(
        `Auto-approved org ${organizationId} (reason: self-hosted)`,
      );
      return { hasAccess: true, autoApproved: true, reason: 'self-hosted' };
    }

    const userEmailDomain = extractDomain(userEmail);
    const orgWebsiteDomain = extractDomain(organization.website);

    if (!userEmailDomain) {
      return { hasAccess: false, autoApproved: false, reason: 'not-eligible' };
    }

    const isTrycompEmail = userEmailDomain === 'trycomp.ai';

    const canAutoApproveViaDomain =
      !isTrycompEmail &&
      Boolean(orgWebsiteDomain) &&
      userEmailDomain === orgWebsiteDomain &&
      !isPublicEmailDomain(userEmailDomain);

    const isStripeCustomer = canAutoApproveViaDomain
      ? await this.stripeService.isDomainActiveCustomer(userEmailDomain)
      : false;

    if (isTrycompEmail || isStripeCustomer) {
      await this.grantAccess(organizationId);
      const reason: AutoApproveReason = isTrycompEmail
        ? 'trycomp-email'
        : 'stripe-customer';
      this.logger.log(
        `Auto-approved org ${organizationId} (reason: ${reason}, domain: ${userEmailDomain})`,
      );
      return { hasAccess: true, autoApproved: true, reason };
    }

    return { hasAccess: false, autoApproved: false, reason: 'not-eligible' };
  }

  private async grantAccess(organizationId: string): Promise<void> {
    await db.organization.update({
      where: { id: organizationId },
      data: { hasAccess: true },
    });
  }
}
