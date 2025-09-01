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
}): Promise<ProvisionMailboxResult> {
  const domain = process.env.SMTP_DOMAIN!;

  // username like org-<id-short>
  const localPart = params.organizationId;
  const email = `comp-${localPart}@${domain}`;
  const password = generateStrongPassword();

  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SES_SMTP_USER, // from SES console
      pass: process.env.SES_SMTP_PASS, // from SES console
    },
  });

  return { email, password };
}
