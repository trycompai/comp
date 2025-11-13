import { Injectable, Logger } from '@nestjs/common';
import {
  sendEmail,
  NdaSigningEmail,
  AccessGrantedEmail,
  AccessReclaimEmail,
} from '@trycompai/email';

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
}
