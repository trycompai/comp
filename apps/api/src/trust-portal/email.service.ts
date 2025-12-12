import { Injectable, Logger } from '@nestjs/common';
import { sendEmail } from '../email/resend';
import { AccessGrantedEmail } from '../email/templates/access-granted';
import { AccessReclaimEmail } from '../email/templates/access-reclaim';
import { NdaSigningEmail } from '../email/templates/nda-signing';
import { AccessRequestNotificationEmail } from '../email/templates/access-request-notification';

@Injectable()
export class TrustEmailService {
  private readonly logger = new Logger(TrustEmailService.name);

  async sendNdaSigningEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    ndaSigningLink: string;
  }): Promise<void> {
    const { toEmail, toName, organizationName, ndaSigningLink } = params;

    const { id } = await sendEmail({
      to: toEmail,
      subject: `NDA Signature Required - ${organizationName}`,
      react: NdaSigningEmail({
        toName,
        organizationName,
        ndaSigningLink,
      }),
      system: true,
    });

    this.logger.log(`NDA signing email sent to ${toEmail} (ID: ${id})`);
  }

  async sendAccessGrantedEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    expiresAt: Date;
    portalUrl?: string | null;
  }): Promise<void> {
    const { toEmail, toName, organizationName, expiresAt, portalUrl } = params;

    const { id } = await sendEmail({
      to: toEmail,
      subject: `Access Granted - ${organizationName}`,
      react: AccessGrantedEmail({
        toName,
        organizationName,
        expiresAt,
        portalUrl,
      }),
      system: true,
    });

    this.logger.log(`Access granted email sent to ${toEmail} (ID: ${id})`);
  }

  async sendAccessReclaimEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    accessLink: string;
    expiresAt: Date;
  }): Promise<void> {
    const { toEmail, toName, organizationName, accessLink, expiresAt } = params;

    const { id } = await sendEmail({
      to: toEmail,
      subject: `Access Your Compliance Data - ${organizationName}`,
      react: AccessReclaimEmail({
        toName,
        organizationName,
        accessLink,
        expiresAt,
      }),
      system: true,
    });

    this.logger.log(`Access reclaim email sent to ${toEmail} (ID: ${id})`);
  }

  async sendAccessRequestNotification(params: {
    toEmail: string;
    organizationName: string;
    requesterName: string;
    requesterEmail: string;
    requesterCompany?: string | null;
    requesterJobTitle?: string | null;
    purpose?: string | null;
    requestedDurationDays?: number | null;
    reviewUrl: string;
  }): Promise<void> {
    const {
      toEmail,
      organizationName,
      requesterName,
      requesterEmail,
      requesterCompany,
      requesterJobTitle,
      purpose,
      requestedDurationDays,
      reviewUrl,
    } = params;

    const { id } = await sendEmail({
      to: toEmail,
      subject: `New Trust Portal Access Request - ${organizationName}`,
      react: AccessRequestNotificationEmail({
        organizationName,
        requesterName,
        requesterEmail,
        requesterCompany,
        requesterJobTitle,
        purpose,
        requestedDurationDays,
        reviewUrl,
      }),
      system: true,
    });

    this.logger.log(
      `Access request notification sent to ${toEmail} for requester ${requesterEmail} (ID: ${id})`,
    );
  }
}
