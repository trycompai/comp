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
      this.logger.warn(
        `NOVU_API_KEY not configured. Skipping Novu workflow trigger for "${workflowId}"`,
      );
      return;
    }

    this.logger.log(
      `Triggering Novu workflow "${workflowId}" for subscriber "${subscriberId}"`,
    );

    try {
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
        this.logger.error(
        `Failed to trigger Novu workflow "${workflowId}" (${response.status}). ${text}`,
        );
      } else {
        const result = await response.json().catch(() => ({}));
        this.logger.log(
          `Successfully triggered Novu workflow "${workflowId}" for subscriber "${subscriberId}"`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error triggering Novu workflow "${workflowId}":`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
