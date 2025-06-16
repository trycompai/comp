import { WaitlistEmail } from "@comp/email/emails/waitlist";
import { sendEmail } from "@comp/email/lib/resend";

export const sendWaitlistEmail = async (params: { email: string }) => {
  const { email } = params;

  const emailTemplate = WaitlistEmail({ email });

  try {
    await sendEmail({
      to: email,
      subject: "Confirm your email to join the Comp AI waitlist",
      react: emailTemplate,
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};
