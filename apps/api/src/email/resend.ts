import * as React from 'react';
import { getMailService } from '@trycompai/email';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export const sendEmail = async ({
  to,
  subject,
  react,
  marketing,
  system,
  test,
  cc,
  scheduledAt,
  attachments,
}: {
  to: string;
  subject: string;
  react: React.ReactNode;
  marketing?: boolean;
  system?: boolean;
  test?: boolean;
  cc?: string | string[];
  scheduledAt?: string;
  attachments?: EmailAttachment[];
}) => {
  const mailService = getMailService();

  // 1) Pull each env var into its own constant
  const fromMarketing = process.env.RESEND_FROM_MARKETING;
  const fromSystem = process.env.RESEND_FROM_SYSTEM;
  const fromDefault = process.env.RESEND_FROM_DEFAULT;
  const toTest = process.env.RESEND_TO_TEST;
  const replyMarketing = process.env.RESEND_REPLY_TO_MARKETING;

  // 2) Decide which one you need for this email
  const fromAddress = marketing
    ? fromMarketing
    : system
      ? fromSystem
      : fromDefault;

  const toAddress = test ? toTest : to;

  const replyTo = marketing ? replyMarketing : undefined;

  // 3) Guard against undefined
  if (!fromAddress) {
    throw new Error('Missing FROM address in environment variables');
  }
  if (!toAddress) {
    throw new Error('Missing TO address in environment variables');
  }

  try {
    const { data, error } = await mailService.send({
      from: fromAddress, // now always a string
      to: toAddress, // now always a string
      cc,
      replyTo,
      subject,
      // @ts-ignore – React node allowed by the SDK
      react,
      scheduledAt,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });

    if (error) {
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      message: 'Email sent successfully',
      id: data?.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    throw error instanceof Error ? error : new Error('Failed to send email');
  }
};
