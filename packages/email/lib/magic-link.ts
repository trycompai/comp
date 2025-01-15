import { MagicLinkEmail } from "@bubba/email/emails/magic-link";
import { sendEmail } from "@bubba/email/lib/resend";

export const sendMagicLinkEmail = async (params: {
  url: string;
  email: string;
}) => {
  const { url, email } = params;

  const emailTemplate = MagicLinkEmail({
    email,
    loginLink: url,
  });
  try {
    await sendEmail({
      to: email,
      subject: "Comp AI Login Link",
      react: emailTemplate,
    });
  } catch (e) {
    console.error(e);
    throw e;
  }
};