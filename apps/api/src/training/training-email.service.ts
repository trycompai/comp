import { Injectable, Logger } from '@nestjs/common';
import { sendEmail } from '../email/resend';
import { TrainingCompletedEmail } from '../email/templates/training-completed';
import { TrainingCertificatePdfService } from './training-certificate-pdf.service';

@Injectable()
export class TrainingEmailService {
  private readonly logger = new Logger(TrainingEmailService.name);

  constructor(
    private readonly certificatePdfService: TrainingCertificatePdfService,
  ) {}

  async sendTrainingCompletedEmail(params: {
    toEmail: string;
    toName: string;
    organizationName: string;
    completedAt: Date;
  }): Promise<void> {
    const { toEmail, toName, organizationName, completedAt } = params;

    // Generate the certificate PDF
    const certificatePdf =
      await this.certificatePdfService.generateTrainingCertificatePdf({
        userName: toName,
        organizationName,
        completedAt,
      });

    this.logger.log(
      `Generated training certificate PDF for ${toEmail} (${certificatePdf.length} bytes)`,
    );

    // Generate a safe filename
    const safeUserName = toName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `security-awareness-training-certificate-${safeUserName}.pdf`;

    const { id } = await sendEmail({
      to: toEmail,
      subject: `Congratulations! You've completed your Security Awareness Training - ${organizationName}`,
      react: TrainingCompletedEmail({
        email: toEmail,
        userName: toName,
        organizationName,
        completedAt,
      }),
      system: true,
      attachments: [
        {
          filename,
          content: certificatePdf,
          contentType: 'application/pdf',
        },
      ],
    });

    this.logger.log(
      `Training completed email sent to ${toEmail} with certificate (ID: ${id})`,
    );
  }
}
