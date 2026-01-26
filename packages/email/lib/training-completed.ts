import TrainingCompletedEmail from '../emails/training-completed';
import { EmailAttachment, sendEmail } from './resend';

export const sendTrainingCompletedEmail = async (params: {
  email: string;
  userName: string;
  organizationName: string;
  completedAt: Date;
  certificatePdf: Buffer;
}) => {
  const { email, userName, organizationName, completedAt, certificatePdf } = params;

  const attachments: EmailAttachment[] = [
    {
      filename: `security-awareness-training-certificate-${userName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
      content: certificatePdf,
      contentType: 'application/pdf',
    },
  ];

  try {
    const sent = await sendEmail({
      to: email,
      subject: `Congratulations! You've completed your Security Awareness Training - ${organizationName}`,
      react: TrainingCompletedEmail({
        email,
        userName,
        organizationName,
        completedAt,
      }),
      system: true,
      attachments,
    });

    if (!sent) {
      console.error('Failed to send training completed email');
      return { success: false };
    }

    return { success: true, id: sent.id };
  } catch (error) {
    console.error('Error sending training completed email:', error);
    return { success: false };
  }
};
