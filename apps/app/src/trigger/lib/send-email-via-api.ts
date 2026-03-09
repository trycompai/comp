import { render } from '@react-email/render';
import { logger } from '@trigger.dev/sdk';
import type { ReactElement } from 'react';

const getApiBaseUrl = () =>
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_BASE_URL ||
  'http://localhost:3333';

interface SendEmailViaApiParams {
  to: string;
  subject: string;
  react: ReactElement;
  organizationId: string;
  system?: boolean;
  from?: string;
  cc?: string | string[];
}

/**
 * Renders a React email template to HTML and sends it through the
 * API's centralized send-email Trigger task.
 * Used by app-side Trigger tasks to avoid calling Resend directly.
 */
export async function sendEmailViaApi(
  params: SendEmailViaApiParams,
): Promise<{ taskId: string }> {
  const html = await render(params.react);
  const apiBaseUrl = getApiBaseUrl();
  const token = process.env.SERVICE_TOKEN_TRIGGER;

  const response = await fetch(`${apiBaseUrl}/v1/internal/email/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? {
            'x-service-token': token,
            'x-organization-id': params.organizationId,
          }
        : {}),
    },
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      html,
      system: params.system,
      from: params.from,
      cc: params.cc,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to send email via API (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as { taskId: string };
  logger.info('Email triggered via API', {
    to: params.to,
    taskId: data.taskId,
  });
  return { taskId: data.taskId };
}
