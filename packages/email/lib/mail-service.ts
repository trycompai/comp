import { render } from '@react-email/render';
import { createTransport, Transporter } from 'nodemailer';
import { MailOptions } from 'nodemailer/lib/smtp-pool';
import { CreateEmailOptions, CreateEmailResponse, Resend } from 'resend';

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

    return this.transporter
      .sendMail(mailOptions)
      .then(({ id }) => ({
        data: { id },
        error: null,
        headers: null,
      }))
      .catch((e) => ({ data: null, error: e, headers: null }));
  }
}

let mailService: MailService | null = null;

const initMailService = (env = process.env): MailService => {
  if (mailService) return mailService;

  if (env.RESEND_API_KEY) {
    console.info('Using Resend as mail service.');
    mailService = new ResendMailService(env.RESEND_API_KEY);
  } else if (
    env.RELAY_SMTP_HOST &&
    env.RELAY_SMTP_PORT &&
    env.RELAY_SMTP_USER &&
    env.RELAY_SMTP_PASS
  ) {
    console.info('Using SMTP-Relay as mail service.');
    mailService = new RelayMailService(
      env.RELAY_SMTP_HOST,
      Number(env.RELAY_SMTP_PORT),
      env.RELAY_SMTP_USER,
      env.RELAY_SMTP_PASS,
    );
  }

  if (!mailService || mailService === null) {
    throw new Error('Mail service not initialized - check configuration');
  }

  return mailService;
};

export const getMailService = (): MailService => {
  if (!mailService) {
    mailService = initMailService();
  }
  return mailService;
};

// export const hasMailService = (): boolean => Boolean(mailService);
