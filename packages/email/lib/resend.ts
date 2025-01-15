import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  marketing,
  system,
  test,
  cc,
  scheduledAt,
}: {
  to: string;
  subject: string;
  react: React.ReactNode;
  marketing?: boolean;
  system?: boolean;
  test?: boolean;
  cc?: string | string[];
  scheduledAt?: string;
}) => {
  if (!resend) {
    throw new Error("Resend not initialized - missing API key");
  }

  try {
    const { data, error } = await resend.emails.send({
      from: marketing
        ? "Comp AI <lewis@mail.trycomp.ai>"
        : system
          ? "Comp AI <system@mail.trycomp.ai>"
          : "Comp AI <lewis@mail.trycomp.ai>",
      to: test ? "lewis@mail.trycomp.ai" : to,
      cc,
      replyTo: marketing ? "lewis@mail.trycomp.ai" : undefined,
      subject,
      react,
      scheduledAt,
    });

    if (error) {
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      message: "Email sent successfully",
      id: data?.id,
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw error instanceof Error ? error : new Error("Failed to send email");
  }
};