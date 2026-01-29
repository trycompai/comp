import { Resend } from 'resend';

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface MailService {
  send(payload: any): Promise<EmailResponse>;
}

interface EmailResponse {
  data: { id: string } | null;
  error: { message: string } | null;
}

class ResendMailService implements MailService {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  send(payload: any): Promise<EmailResponse> {
    return this.resend.emails.send(payload);
  }
}

let mailService: MailService | null = null;

if (process.env.RESEND_API_KEY) {
  mailService = new ResendMailService(process.env.RESEND_API_KEY);
}

export default mailService;