'use server';

import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

type ProvisionMailboxResult = {
  email: string;
  password: string;
};

function generateStrongPassword(): string {
  // 24 chars: alnum + symbols
  const raw = crypto.randomBytes(32).toString('base64url');
  const symbols = '!@#$%^&*()-_=+[]{}';
  const pick = (s: string, n: number) =>
    Array.from({ length: n }, () => s[Math.floor(Math.random() * s.length)]).join('');
  const pwd = (raw.slice(0, 18) + pick(symbols, 6))
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
  return pwd;
}

export async function provisionOrgMailbox(params: {
  organizationId: string;
  notifyEmail?: string; // optionally notify creator
}): Promise<ProvisionMailboxResult> {
  const domain = process.env.MAIL_PROVISION_DOMAIN!;

  // username like org-<id-short>
  const localPart = `org-${params.organizationId}`;
  const email = `${localPart}@${domain}`;
  const password = generateStrongPassword();

  // Optionally notify creator with the credentials using Nodemailer
  if (params.notifyEmail) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Boolean(process.env.SMTP_SECURE === 'true'),
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER!,
      to: params.notifyEmail,
      subject: `New org mailbox created: ${email}`,
      text: `Credentials for organization ${params.organizationId}\nEmail: ${email}\nPassword: ${password}`,
    });
  }

  return { email, password };
}
