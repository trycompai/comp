import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  identityCreateResponseSchema,
  type IdentityCreateResponse,
} from './background-checks.types';

@Injectable()
export class BackgroundCheckIdentityClient {
  private readonly logger = new Logger(BackgroundCheckIdentityClient.name);

  async createBackgroundCheck(params: {
    organizationId: string;
    memberId: string;
    employeeName: string;
    employeeEmail: string;
    requesterEmail: string;
  }): Promise<IdentityCreateResponse> {
    const apiKey = process.env.BACKGROUND_CHECK_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('BACKGROUND_CHECK_API_KEY is not configured.');
    }

    const baseUrl = this.baseUrl();
    const callbackUrl = this.callbackUrl();

    const response = await this.fetchIdentity(`${baseUrl}/v1/background-checks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `comp-background-check:${params.memberId}`,
      },
      body: JSON.stringify({
        candidate: {
          name: params.employeeName,
          email: params.employeeEmail,
        },
        requester: {
          email: params.requesterEmail,
        },
        employmentHistory: [],
        references: [],
        metadata: {
          source: 'comp',
          compOrganizationId: params.organizationId,
          compMemberId: params.memberId,
        },
        callbackUrl,
      }),
    });

    const json = await this.readJson(response);
    if (!response.ok) {
      this.logger.error('Identity background check request failed', json);
      throw new BadRequestException('Identity background check request failed.');
    }

    return identityCreateResponseSchema.parse(json);
  }

  async getBackgroundCheck(identityBackgroundCheckId: string): Promise<unknown> {
    const apiKey = process.env.BACKGROUND_CHECK_API_KEY;
    if (!apiKey) return null;

    const response = await this.fetchIdentity(
      `${this.baseUrl()}/v1/background-checks/${identityBackgroundCheckId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    if (!response.ok) {
      return null;
    }

    return this.readJson(response);
  }

  private baseUrl(): string {
    const baseUrl =
      process.env.BACKGROUND_CHECK_API_BASE_URL ?? 'https://glad-sturgeon-729.convex.site';
    return baseUrl.replace(/\/+$/, '');
  }

  private callbackUrl(): string {
    const endpoint = process.env.BACKGROUND_WH_ENDPOINT?.trim();
    return (endpoint || 'https://api.trycomp.ai/v1/background-checks/webhook').replace(
      /\/+$/,
      '',
    );
  }

  private async fetchIdentity(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      this.logger.error('Identity background check network request failed', {
        url,
        error: this.describeError(error),
      });
      throw new BadRequestException(
        'Identity background check service is unreachable from the API server.',
      );
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const body = await response.text();
    if (!body) return null;

    try {
      return JSON.parse(body) as unknown;
    } catch {
      return { error: body };
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      const cause = 'cause' in error ? error.cause : undefined;
      if (cause instanceof Error) {
        return `${error.message}: ${cause.message}`;
      }
      return error.message;
    }

    return 'Unknown error';
  }
}
