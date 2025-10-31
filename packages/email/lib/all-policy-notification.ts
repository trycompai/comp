import AllPolicyNotificationEmail from '../emails/all-policy-notification';
import { sendEmail } from './resend';

export const sendAllPolicyNotificationEmail = async (params: {
  email: string;
  userName: string;
  organizationName: string;
  organizationId: string;
}) => {
  const {
    email,
    userName,
    organizationName,
    organizationId,
  } = params;
  const subjectText = 'Please review and accept the policies';

  try {
    const sent = await sendEmail({
      to: email,
      subject: subjectText,
      react: AllPolicyNotificationEmail({
        email,
        userName,
        organizationName,
        organizationId,
      }),
      system: true, // Use system email address
    });

    if (!sent) {
      console.error('Failed to send all-policy notification email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending all-policy notification email:', error);
    return { success: false };
  }
};

