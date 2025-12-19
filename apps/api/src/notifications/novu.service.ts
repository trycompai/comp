import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NovuService {
  private readonly logger = new Logger(NovuService.name);

  async trigger(params: {
    workflowId: string;
    subscriberId: string;
    email: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const { workflowId, subscriberId, email, payload } = params;

    const novuApiKey = process.env.NOVU_API_KEY;
    if (!novuApiKey) {
      // Silent skip in environments without Novu configured
      return;
    }

    const response = await fetch('https://api.novu.co/v1/events/trigger', {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${novuApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: workflowId,
        to: {
          subscriberId,
          email,
        },
        payload,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.warn(
        `Failed to trigger Novu workflow "${workflowId}" (${response.status}). ${text}`,
      );
    }
  }
}


