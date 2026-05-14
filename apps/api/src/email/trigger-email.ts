import { render } from '@react-email/render';
import { tasks } from '@trigger.dev/sdk';
import type { ReactElement } from 'react';
import type { EmailChannel, sendEmailTask } from '../trigger/email/send-email';
import type { EmailAttachment } from './resend';

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

    const handle = await tasks.trigger<typeof sendEmailTask>('send-email', {
      to: params.to,
      subject: params.subject,
      html,
      channel,
      cc: params.cc,
      scheduledAt: params.scheduledAt,
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
    console.error('[triggerEmail] Failed to trigger email task', {
      to: params.to,
      subject: params.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
