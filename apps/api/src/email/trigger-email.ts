import { render } from '@react-email/render';
import { tasks } from '@trigger.dev/sdk';
import type { ReactElement } from 'react';
import { generateUnsubscribeToken } from '@trycompai/email';
import type { EmailChannel, sendEmailTask } from '../trigger/email/send-email';
import type { EmailAttachment } from './resend';
import { sendHtmlEmail } from './email-transport';

type TriggerEmailFlags = {
  marketing?: boolean;
  system?: boolean;
  trustPortal?: boolean;
};

function resolveChannel(flags: TriggerEmailFlags): EmailChannel {
  if (flags.trustPortal) return 'trustPortal';
  if (flags.marketing) return 'marketing';
  if (flags.system) return 'system';
  return 'default';
}

async function sendEmailDirect(params: {
  to: string;
  subject: string;
  html: string;
  channel: EmailChannel;
  cc?: string | string[];
  scheduledAt?: string;
  attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.trycomp.ai';
  const token = generateUnsubscribeToken(params.to);
  const oneClickUrl = `${apiBaseUrl}/v1/email/unsubscribe?email=${encodeURIComponent(params.to)}&token=${encodeURIComponent(token)}`;

  return sendHtmlEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
    channel: params.channel,
    cc: params.cc,
    scheduledAt: params.scheduledAt,
    attachments: params.attachments,
    headers: {
      'List-Unsubscribe': `<${oneClickUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function triggerEmail(params: {
  to: string;
  subject: string;
  react: ReactElement;
  marketing?: boolean;
  system?: boolean;
  trustPortal?: boolean;
  cc?: string | string[];
  scheduledAt?: string;
  attachments?: EmailAttachment[];
}): Promise<{ id: string }> {
  try {
    const html = await render(params.react);
    const channel = resolveChannel(params);
    const payload = {
      to: params.to,
      subject: params.subject,
      html,
      channel,
      cc: params.cc,
      scheduledAt: params.scheduledAt,
      attachments: params.attachments,
    };

    if (!process.env.TRIGGER_SECRET_KEY) {
      console.log(
        'TRIGGER_SECRET_KEY not set; sending email directly via configured transport',
      );
      return sendEmailDirect(payload);
    }

    const handle = await tasks.trigger<typeof sendEmailTask>('send-email', {
      ...payload,
      attachments: params.attachments?.map((att) => ({
        filename: att.filename,
        content:
          typeof att.content === 'string'
            ? att.content
            : att.content.toString('base64'),
        contentType: att.contentType,
      })),
    });

    return { id: handle.id };
  } catch (error) {
    console.error('Failed to send/trigger email', {
      to: params.to,
      subject: params.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
