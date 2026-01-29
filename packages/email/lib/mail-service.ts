import { CreateEmailOptions, CreateEmailResponse, Resend } from 'resend';
import { createTransport, Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { MailOptions } from 'nodemailer/lib/smtp-pool';

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface MailService {
  send(payload: CreateEmailOptions): Promise<CreateEmailResponse>;
}

class ResendMailService implements MailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  send(payload: CreateEmailOptions): Promise<CreateEmailResponse> {
    return this.resend.emails.send(payload);
  }
}

class RelayMailService implements MailService {
  private transporter: Transporter;

  constructor(host: string, port: number, user: string, pass: string) {
    this.transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  async send(payload: CreateEmailOptions): Promise<CreateEmailResponse> {
    const { react } = payload;
    const html = react ? await render(react) : undefined;
    const mailOptions: MailOptions = { html, ...payload };

    return this.transporter.sendMail(mailOptions).then(({ id }) => ({
      data: { id },
      error: null,
    })).catch(e => ({ data: null, error: e }));
  }
}

let mailService: MailService | null = null;

if (process.env.RESEND_API_KEY) {
  mailService = new ResendMailService(process.env.RESEND_API_KEY);
} else if (
  process.env.RELAY_SMTP_HOST &&
  process.env.RELAY_SMTP_PORT &&
  process.env.RELAY_SMTP_USER &&
  process.env.RELAY_SMTP_PASS
) {
  mailService = new RelayMailService(
    process.env.RELAY_SMTP_HOST,
    Number(process.env.RELAY_SMTP_PORT),
    process.env.RELAY_SMTP_USER,
    process.env.RELAY_SMTP_PASS,
  );
}

export default mailService;