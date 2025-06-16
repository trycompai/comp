import { MagicLinkEmail } from "@comp/email/emails/magic-link";
import { sendEmail } from "@comp/email/lib/resend";

export const sendMagicLinkEmail = async (params: {
  url: string;
  email: string;
  inviteCode?: string;
}) => {
  const { url, email, inviteCode } = params;

  const emailTemplate = MagicLinkEmail({
    email,
    url: url,
    inviteCode,
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
