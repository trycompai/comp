import { MagicLinkEmail } from '../emails/magic-link';
import { sendEmail } from './resend';

export const sendMagicLinkEmail = async (params: {
  url: string;
  email: string;
  inviteCode?: string;
}) => {
  const { url, email, inviteCode } = params;

  try {
    const sent = await sendEmail({
      to: email,
      subject: 'Your sign-in link for Comp AI',
      react: MagicLinkEmail({ url, email, inviteCode }),
    });

    if (!sent) {
      console.error('Failed to send magic link email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { success: false };
  }
};
