import InviteEmail from '../emails/invite';
import { sendEmail } from './resend';

export const sendInviteMemberEmail = async (params: {
  organizationName: string;
  inviteLink: string;
  inviteeEmail: string;
}) => {
  const { organizationName, inviteLink, inviteeEmail } = params;

  try {
    const sent = await sendEmail({
      to: inviteeEmail,
      subject: `You've been invited to join ${organizationName} on Comp AI`,
      react: InviteEmail({
        organizationName,
        inviteLink,
      }),
    });

    if (!sent) {
      console.error('Failed to send invite email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending invite email:', error);
    return { success: false };
  }
};
