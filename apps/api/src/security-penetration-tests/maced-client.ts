import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';

const macedPentestStatusSchema = z.enum([
  'provisioning',
  'cloning',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

const macedPentestProgressSchema = z.object({
  status: macedPentestStatusSchema,
  completedAgents: z.number().int(),
  totalAgents: z.number().int(),
  elapsedMs: z.number(),
});

const nonEmptyStringSchema = z.string().trim().min(1);
const nonEmptyDateTimeSchema = nonEmptyStringSchema.datetime();

const normalizeBlankToNull = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const nullableNonEmptyStringSchema = z
  .preprocess(normalizeBlankToNull, nonEmptyStringSchema.nullable().optional())
  .transform((value) => value ?? null);

const nullableUrlSchema = z
  .preprocess(normalizeBlankToNull, z.string().url().nullable().optional())
  .transform((value) => value ?? null);

const macedPentestRunSchema = z
  .object({
    id: nonEmptyStringSchema,
    targetUrl: z.string().url(),
    repoUrl: nullableUrlSchema,
    status: macedPentestStatusSchema,
    testMode: z.boolean().optional(),
    createdAt: nonEmptyDateTimeSchema,
    updatedAt: nonEmptyDateTimeSchema,
    error: nullableNonEmptyStringSchema,
    temporalUiUrl: nullableUrlSchema,
    webhookUrl: nullableUrlSchema,
    notificationEmail: nullableNonEmptyStringSchema,
  })
  .passthrough();

const macedCreatePentestRunSchema = macedPentestRunSchema.extend({
  webhookToken: nullableNonEmptyStringSchema,
});

const macedPentestRunWithProgressSchema = macedPentestRunSchema.extend({
  progress: macedPentestProgressSchema,
});

const macedPentestRunListSchema = z.array(macedPentestRunSchema);

const macedCreatePentestPayloadSchema = z
  .object({
    targetUrl: z.string().url(),
    repoUrl: z.string().url().optional(),
    githubToken: z.string().optional(),
    configYaml: z.string().optional(),
    pipelineTesting: z.boolean().optional(),
    testMode: z.boolean().optional(),
    workspace: z.string().optional(),
    webhookUrl: z.string().url().optional(),
    notificationEmail: z.string().email().optional(),
  })
  .strict();

export type MacedPentestStatus = z.infer<typeof macedPentestStatusSchema>;
export type MacedPentestProgress = z.infer<typeof macedPentestProgressSchema>;
export type MacedPentestRun = z.infer<typeof macedPentestRunSchema>;
export type MacedCreatePentestRun = z.infer<typeof macedCreatePentestRunSchema>;
export type MacedPentestRunWithProgress = z.infer<
  typeof macedPentestRunWithProgressSchema
>;
export type MacedCreatePentestPayload = z.infer<
  typeof macedCreatePentestPayloadSchema
>;

export class MacedClient {
  private readonly logger = new Logger(MacedClient.name);
  private readonly apiBaseUrl =
    process.env.MACED_API_BASE_URL ?? 'https://api.maced.ai';
  private readonly apiKey = process.env.MACED_API_KEY;

  private get providerHeaders() {
    if (!this.apiKey) {
      this.logger.error('MACED_API_KEY is not configured');
      throw new InternalServerErrorException(
        'Maced API key not configured on server',
      );
    }

    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  private async parseErrorPayload(response: Response): Promise<string> {
    const text = await response.text().catch(() => '');
    if (!text) {
      return `Request failed with status ${response.status}`;
    }

    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error ?? parsed.message ?? text;
    } catch {
      return text;
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.apiBaseUrl}${path}`, {
        ...init,
        headers: {
          ...this.providerHeaders,
          ...init.headers,
        },
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Transport failure calling Maced endpoint ${path}`,
        error instanceof Error ? error.message : String(error),
      );
      throw new HttpException(
        { error: 'Unable to reach penetration test provider' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (!response.ok) {
      const error = await this.parseErrorPayload(response);
      throw new HttpException(
        {
          error,
        },
        response.status as HttpStatus,
      );
    }

    return response;
  }

  private parseValidatedJson<T>(
    body: string,
    schema: z.ZodType<T>,
    context: string,
  ): T {
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body) as unknown;
    } catch (error) {
      this.logger.error(
        `Unable to parse Maced JSON response (${context})`,
        error instanceof Error ? error.message : String(error),
      );
      throw new HttpException(
        { error: 'Invalid response received from penetration test provider' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const validated = schema.safeParse(parsedBody);
    if (!validated.success) {
      this.logger.error(
        `Maced response schema validation failed (${context})`,
        validated.error.message,
      );
      throw new HttpException(
        { error: 'Invalid response received from penetration test provider' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    return validated.data;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit,
    schema: z.ZodType<T>,
    context: string,
  ): Promise<T> {
    const response = await this.request(path, init);
    const body = await response.text();
    if (!body) {
      throw new HttpException(
        { error: `Empty response while ${context}` },
        HttpStatus.BAD_GATEWAY,
      );
    }

    return this.parseValidatedJson(body, schema, context);
  }

  async listPentests(): Promise<MacedPentestRun[]> {
    const response = await this.request('/v1/pentests', { method: 'GET' });
    const body = await response.text();
    if (!body) {
      return [];
    }

    return this.parseValidatedJson(
      body,
      macedPentestRunListSchema,
      'listing penetration tests',
    );
  }

  async createPentest(payload: MacedCreatePentestPayload): Promise<MacedCreatePentestRun> {
    const validatedPayload = macedCreatePentestPayloadSchema.safeParse(payload);
    if (!validatedPayload.success) {
      this.logger.error(
        'Invalid create pentest payload',
        validatedPayload.error.message,
      );
      throw new HttpException(
        { error: 'Invalid request payload for penetration test provider' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.requestJson(
      '/v1/pentests',
      {
        method: 'POST',
        body: JSON.stringify(validatedPayload.data),
      },
      macedCreatePentestRunSchema,
      'creating penetration test',
    );
  }

  async getPentest(id: string): Promise<MacedPentestRunWithProgress> {
    return this.requestJson(
      `/v1/pentests/${encodeURIComponent(id)}`,
      {
        method: 'GET',
      },
      macedPentestRunWithProgressSchema,
      `fetching penetration test ${id}`,
    );
  }

  async getPentestProgress(id: string): Promise<MacedPentestProgress> {
    return this.requestJson(
      `/v1/pentests/${encodeURIComponent(id)}/progress`,
      {
        method: 'GET',
      },
      macedPentestProgressSchema,
      `fetching penetration test progress ${id}`,
    );
  }

  getPentestReportRaw(id: string): Promise<Response> {
    return this.request(`/v1/pentests/${encodeURIComponent(id)}/report/raw`, {
      method: 'GET',
    });
  }

  getPentestReportPdf(id: string): Promise<Response> {
    return this.request(`/v1/pentests/${encodeURIComponent(id)}/report/pdf`, {
      method: 'GET',
    });
  }
}
