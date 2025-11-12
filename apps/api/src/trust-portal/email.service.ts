import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class TrustEmailService {
  private readonly logger = new Logger(TrustEmailService.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@compai.pub';
  }

  async sendNdaSigningEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    ndaSigningLink: string;
    scopes: string[];
  }): Promise<void> {
    const { toEmail, toName, organizationName, ndaSigningLink, scopes } =
      params;

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: toEmail,
      subject: `NDA Signature Required - ${organizationName}`,
      html: this.getNdaEmailTemplate({
        toName,
        organizationName,
        ndaSigningLink,
        scopes,
      }),
    });

    if (error) {
      this.logger.error(`Failed to send NDA email to ${toEmail}:`, error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    this.logger.log(`NDA signing email sent to ${toEmail} (ID: ${data.id})`);
  }

  async sendAccessGrantedEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    scopes: string[];
    expiresAt: Date;
  }): Promise<void> {
    const { toEmail, toName, organizationName, scopes, expiresAt } = params;

    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: toEmail,
      subject: `Access Granted - ${organizationName}`,
      html: this.getAccessGrantedTemplate({
        toName,
        organizationName,
        scopes,
        expiresAt,
      }),
    });

    if (error) {
      this.logger.error(`Failed to send access granted email to ${toEmail}:`, error);
      throw new Error(`Email send failed: ${error.message}`);
    }

    this.logger.log(`Access granted email sent to ${toEmail} (ID: ${data.id})`);
  }

  private getNdaEmailTemplate(params: {
    toName: string;
    organizationName: string;
    ndaSigningLink: string;
    scopes: string[];
  }): string {
    const { toName, organizationName, ndaSigningLink, scopes } = params;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #1a1a1a; margin: 0;">NDA Signature Required</h1>
          </div>

          <p>Hello ${toName},</p>

          <p>Your request for access to ${organizationName}'s compliance documentation has been approved.</p>

          <p><strong>Before you can access the documents, you must review and sign a Non-Disclosure Agreement (NDA).</strong></p>

          <p>The NDA covers access to the following:</p>
          <ul>
            ${scopes.map((scope) => `<li>${scope}</li>`).join('')}
          </ul>

          <p>
            <a href="${ndaSigningLink}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Review and Sign NDA
            </a>
          </p>

          <p>This link will expire in 7 days. If you need a new link, please contact the organization.</p>

          <p style="color: #666; font-size: 14px; margin-top: 40px;">
            This is an automated message from Comp AI. Please do not reply to this email.
          </p>
        </body>
      </html>
    `;
  }

  private getAccessGrantedTemplate(params: {
    toName: string;
    organizationName: string;
    scopes: string[];
    expiresAt: Date;
  }): string {
    const { toName, organizationName, scopes, expiresAt } = params;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <h1 style="color: #155724; margin: 0;">Access Granted ✓</h1>
          </div>

          <p>Hello ${toName},</p>

          <p>Your NDA has been signed and your access to ${organizationName}'s compliance documentation is now active.</p>

          <p><strong>You now have access to:</strong></p>
          <ul>
            ${scopes.map((scope) => `<li>${scope}</li>`).join('')}
          </ul>

          <p>Your access will expire on: <strong>${expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>

          <p>You can download your signed NDA for your records from the link provided on the confirmation page.</p>

          <p style="color: #666; font-size: 14px; margin-top: 40px;">
            This is an automated message from Comp AI. Please do not reply to this email.
          </p>
        </body>
      </html>
    `;
  }
}
