import PolicyNotificationEmail from '../emails/policy-notification';
import { sendEmail } from './resend';

export const sendPolicyNotificationEmail = async (params: {
  email: string;
  userName: string;
  policyName: string;
  organizationName: string;
  organizationId: string;
  notificationType: 'new' | 'updated' | 're-acceptance';
}) => {
  const {
    email,
    userName,
    policyName,
    organizationName,
    organizationId,
    notificationType,
  } = params;

  const getSubjectText = () => {
    switch (notificationType) {
      case 'new':
        return `New Policy: ${policyName} - Requires Your Acceptance`;
      case 'updated':
        return `Updated Policy: ${policyName} - Requires Your Acceptance`;
      case 're-acceptance':
        return `Policy Updated: ${policyName} - Please Accept Again`;
      default:
        return `Policy Notification: ${policyName}`;
    }
  };

  try {
    const sent = await sendEmail({
      to: email,
      subject: getSubjectText(),
      react: PolicyNotificationEmail({
        email,
        userName,
        policyName,
        organizationName,
        organizationId,
        notificationType,
      }),
      system: true, // Use system email address
    });

    if (!sent) {
      console.error('Failed to send policy notification email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending policy notification email:', error);
    return { success: false };
  }
};
