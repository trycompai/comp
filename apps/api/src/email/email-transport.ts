import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { resend } from './resend';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export type EmailChannel = 'marketing' | 'system' | 'trustPortal' | 'default';

export function isBunMailConfigured(): boolean {
  return Boolean(process.env.BUNMAIL_API_URL?.trim());
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

export function resolveFromAddressForChannel(
  channel: EmailChannel | undefined,
): string | undefined {
  const bunMailFrom = process.env.BUNMAIL_FROM?.trim();
  if (bunMailFrom) return bunMailFrom;

  const smtpFrom = process.env.SMTP_FROM?.trim();
  if (smtpFrom) return smtpFrom;

  const fromMarketing = process.env.RESEND_FROM_MARKETING;
  const fromSystem = process.env.RESEND_FROM_SYSTEM;
  const fromDefault = process.env.RESEND_FROM_DEFAULT;
  const fromTrustPortal = process.env.RESEND_FROM_TRUST_PORTAL;

  switch (channel) {
    case 'trustPortal':
      return fromTrustPortal ?? fromSystem;
    case 'marketing':
      return fromMarketing;
    case 'system':
      return fromSystem;
    case 'default':
      return fromDefault;
    default:
      return undefined;
  }
}

function resolveSmtpTransport() {
  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: pass ?? '' } : undefined,
  });
}

function normalizeAttachments(
  attachments?: EmailAttachment[],
): Mail.Attachment[] | undefined {
  return attachments?.map((att) => ({
    filename: att.filename,
    content: att.content,
    contentType: att.contentType,
  }));
}

async function sendViaBunMail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  cc?: string | string[];
}): Promise<{ id: string }> {
  const apiUrl = process.env.BUNMAIL_API_URL!.trim().replace(/\/$/, '');
  const apiKey = process.env.BUNMAIL_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('BUNMAIL_API_KEY is required when BUNMAIL_API_URL is set');
  }

  const cc = Array.isArray(params.cc) ? params.cc.join(',') : params.cc;

  const response = await fetch(`${apiUrl}/api/v1/emails/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      cc,
      subject: params.subject,
      html: params.html,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: { id?: string }; error?: string; message?: string }
    | null;

  if (!response.ok || !body?.success) {
    const message =
      body?.error || body?.message || `BunMail API error (${response.status})`;
    throw new Error(message);
  }

  return { id: body.data?.id ?? 'bunmail' };
}

async function sendViaSmtp(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  cc?: string | string[];
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
  const transport = resolveSmtpTransport();
  const info = await transport.sendMail({
    from: params.from,
    to: params.to,
    cc: params.cc,
    subject: params.subject,
    html: params.html,
    headers: params.headers,
    attachments: normalizeAttachments(params.attachments),
  });

  return { id: info.messageId || 'smtp' };
}

async function sendViaResend(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  cc?: string | string[];
  headers?: Record<string, string>;
  scheduledAt?: string;
  attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
  if (!resend) {
    throw new Error(
      'Email not configured: set BUNMAIL_API_URL, SMTP_HOST, or RESEND_API_KEY in environment variables',
    );
  }

  const { data, error } = await resend.emails.send({
    from: params.from,
    to: params.to,
    cc: params.cc,
    subject: params.subject,
    html: params.html,
    headers: params.headers,
    scheduledAt: params.scheduledAt,
    attachments: params.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  if (error) {
    console.error('Resend API error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { id: data?.id ?? 'resend' };
}

export async function sendHtmlEmail(params: {
  to: string;
  subject: string;
  html: string;
  channel?: EmailChannel;
  from?: string;
  cc?: string | string[];
  headers?: Record<string, string>;
  scheduledAt?: string;
  attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
  const fromAddress =
    params.from ??
    resolveFromAddressForChannel(params.channel) ??
    process.env.BUNMAIL_FROM ??
    process.env.SMTP_FROM ??
    process.env.RESEND_FROM_SYSTEM ??
    process.env.RESEND_FROM_DEFAULT;
  const toAddress = process.env.RESEND_TO_TEST ?? params.to;

  if (!fromAddress) {
    throw new Error(
      'Missing FROM address: set BUNMAIL_FROM, SMTP_FROM, or RESEND_FROM_DEFAULT in environment variables',
    );
  }
  if (!toAddress) {
    throw new Error('Missing TO address in environment variables');
  }

  if (isBunMailConfigured()) {
    return sendViaBunMail({
      from: fromAddress,
      to: toAddress,
      subject: params.subject,
      html: params.html,
      cc: params.cc,
    });
  }

  if (isSmtpConfigured()) {
    return sendViaSmtp({
      from: fromAddress,
      to: toAddress,
      subject: params.subject,
      html: params.html,
      cc: params.cc,
      headers: params.headers,
      attachments: params.attachments,
    });
  }

  return sendViaResend({
    from: fromAddress,
    to: toAddress,
    subject: params.subject,
    html: params.html,
    cc: params.cc,
    headers: params.headers,
    scheduledAt: params.scheduledAt,
    attachments: params.attachments,
  });
}
