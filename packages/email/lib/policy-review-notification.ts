import PolicyReviewNotificationEmail from '../emails/policy-review-notification';
import { sendEmail } from './resend';

export const sendPolicyReviewNotificationEmail = async (params: {
  email: string;
  userName: string;
  policyName: string;
  organizationName: string;
  organizationId: string;
  policyId: string;
}) => {
  const { email, userName, policyName, organizationName, organizationId, policyId } = params;
  const subjectText = 'Policy review required';

  try {
    const sent = await sendEmail({
      to: email,
      subject: subjectText,
      react: PolicyReviewNotificationEmail({
        email,
        userName,
        policyName,
        organizationName,
        organizationId,
        policyId,
      }),
      system: true,
    });

    if (!sent) {
      console.error('Failed to send policy review notification email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending policy review notification email:', error);
    return { success: false };
  }
};


