import { WaitlistEmail } from '../emails/waitlist';
import { sendEmail } from './resend';

export const sendWaitlistEmail = async (params: { email: string }) => {
  const { email } = params;

  try {
    const sent = await sendEmail({
      to: email,
      subject: 'Welcome to the Comp AI waitlist!',
      react: WaitlistEmail({ email }),
    });

    if (!sent) {
      console.error('Failed to send waitlist email');
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending waitlist email:', error);
    return { success: false };
  }
};
