import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { db } from '@trycompai/db';
import { createHash, timingSafeEqual } from 'node:crypto';

import type { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import { MacedClient, type MacedPentestProgress } from './maced-client';

export type PentestReportStatus =
  | 'provisioning'
  | 'cloning'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PentestProgress = MacedPentestProgress;

export interface SecurityPenetrationTest {
  id: string;
  sandboxId: string;
  workflowId: string;
  sessionId: string;
  targetUrl: string;
  repoUrl: string | null;
  status: PentestReportStatus;
  testMode?: boolean | null;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  temporalUiUrl?: string | null;
  webhookUrl?: string | null;
  webhookToken?: string | null;
  userId: string;
  organizationId: string;
  progress?: PentestProgress;
}

export interface BinaryArtifact {
  buffer: Buffer;
  contentType: string;
  contentDisposition?: string | null;
}

interface PentestCompletedWebhookPayload {
  id: string;
  report: {
    markdown: string;
    costUsd: number;
    durationMs: number;
    agentCount: number;
  };
}

interface PentestFailedWebhookPayload {
  id: string;
  error: string;
  failedAt: string;
}

type WebhookEventType = 'status' | 'completed' | 'failed';

interface WebhookRequestMetadata {
  webhookToken?: string;
  eventId?: string;
}

interface PersistedWebhookHandshake {
  tokenHash: string;
  createdAt: string;
  lastEventId?: string;
  lastPayloadHash?: string;
  lastWebhookAt?: string;
}

@Injectable()
export class SecurityPenetrationTestsService {
  private readonly logger = new Logger(SecurityPenetrationTestsService.name);
  private readonly macedClient = new MacedClient();
  private get defaultWebhookBase() {
    return process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL;
  }

  async listReports(organizationId: string): Promise<SecurityPenetrationTest[]> {
    const ownedRunIds = await this.listOwnedRunIds(organizationId);
    if (ownedRunIds.size === 0) {
      return [];
    }

    const reports = await this.macedClient.listPentests();

    return reports.filter((report) => {
      return ownedRunIds.has(report.id);
    }) as SecurityPenetrationTest[];
  }

  async createReport(
    organizationId: string,
    payload: CreatePenetrationTestDto,
  ): Promise<SecurityPenetrationTest> {
    const resolvedWebhookUrl = this.resolveWebhookUrl(
      organizationId,
      payload.webhookUrl,
    );

    const sanitizedPayload = {
      targetUrl: payload.targetUrl,
      repoUrl: payload.repoUrl,
      githubToken: payload.githubToken,
      configYaml: payload.configYaml,
      pipelineTesting: payload.pipelineTesting,
      testMode: payload.testMode,
      workspace: payload.workspace,
      mockCheckout: payload.mockCheckout,
      webhookUrl: resolvedWebhookUrl,
    };

    const createdReport = await this.macedClient.createPentest(sanitizedPayload);

    const providerRunId = createdReport.id;

    if (!providerRunId) {
      throw new HttpException(
        { error: 'Create response missing report identifier' },
        HttpStatus.BAD_GATEWAY,
      );
    }
    const webhookToken = createdReport.webhookToken;

    if (
      resolvedWebhookUrl &&
      this.isCompWebhookUrl(resolvedWebhookUrl) &&
      !webhookToken
    ) {
      throw new HttpException(
        {
          error:
            'Penetration test was created at provider but webhook handshake token was missing',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (
      resolvedWebhookUrl &&
      this.isCompWebhookUrl(resolvedWebhookUrl) &&
      webhookToken
    ) {
      const handshakePersisted = await this.persistWebhookHandshakeWithRetry(
        organizationId,
        providerRunId,
        webhookToken,
      );
      if (!handshakePersisted) {
        throw new HttpException(
          {
            error:
              'Penetration test was created at provider but webhook handshake could not be persisted',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
    }

    const ownershipPersisted = await this.persistRunOwnershipWithRetry(
      organizationId,
      providerRunId,
    );
    if (!ownershipPersisted) {
      throw new HttpException(
        {
          error:
            'Penetration test was created at provider but ownership mapping could not be persisted',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }

    return createdReport as SecurityPenetrationTest;
  }

  async getReport(organizationId: string, id: string): Promise<SecurityPenetrationTest> {
    await this.assertRunOwnership(organizationId, id);
    const report = await this.macedClient.getPentest(id);
    return report as SecurityPenetrationTest;
  }

  async getReportProgress(
    organizationId: string,
    id: string,
  ): Promise<PentestProgress> {
    await this.assertRunOwnership(organizationId, id);
    return this.macedClient.getPentestProgress(id);
  }

  async getReportOutput(organizationId: string, id: string): Promise<BinaryArtifact> {
    await this.getReport(organizationId, id);

    const response = await this.macedClient.getPentestReportRaw(id);

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('Content-Type') || 'text/markdown; charset=utf-8',
      contentDisposition: response.headers.get('Content-Disposition'),
    };
  }

  async getReportPdf(organizationId: string, id: string): Promise<BinaryArtifact> {
    await this.getReport(organizationId, id);

    const response = await this.macedClient.getPentestReportPdf(id);

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('Content-Type') || 'application/pdf',
      contentDisposition:
        response.headers.get('Content-Disposition') ||
        `attachment; filename="penetration-test-${id}.pdf"`,
    };
  }

  async handleWebhook(
    organizationId: string,
    payload: unknown,
    metadata: WebhookRequestMetadata = {},
  ): Promise<{
    success: true;
    organizationId: string;
    reportId?: string;
    status?: string;
    eventType: WebhookEventType;
    duplicate?: true;
    report?: {
      costUsd: number;
      durationMs: number;
      agentCount: number;
      hasMarkdown: true;
    };
    failure?: {
      error: string;
      failedAt: string;
    };
  }> {
    if (!this.isRecord(payload)) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const completedEvent = this.extractCompletedWebhookPayload(payload);
    const failedEvent = this.extractFailedWebhookPayload(payload);

    const payloadReportId =
      completedEvent?.id ??
      failedEvent?.id ??
      this.extractStringField(payload, 'id');

    if (!payloadReportId) {
      throw new BadRequestException('Webhook payload must include a report id');
    }

    const duplicate = await this.verifyAndRecordWebhookHandshake({
      organizationId,
      reportId: payloadReportId,
      payload,
      webhookToken: metadata.webhookToken,
      eventId: metadata.eventId,
    });

    const payloadStatus =
      this.extractStringField(payload, 'status') ||
      this.extractStringField(payload, 'reportStatus') ||
      (completedEvent ? 'completed' : undefined) ||
      (failedEvent ? 'failed' : undefined);

    const eventType: WebhookEventType = completedEvent ? 'completed' : failedEvent ? 'failed' : 'status';

    this.logger.log(
      `[Webhook] Received penetration test ${eventType} event for org=${organizationId}${payloadReportId ? ` run=${payloadReportId}` : ''} status=${payloadStatus ?? 'unknown'}`,
    );

    return {
      success: true,
      organizationId,
      eventType,
      ...(payloadReportId ? { reportId: payloadReportId } : {}),
      ...(payloadStatus ? { status: payloadStatus } : {}),
      ...(duplicate ? ({ duplicate: true } as const) : {}),
      ...(completedEvent
        ? {
            report: {
              costUsd: completedEvent.report.costUsd,
              durationMs: completedEvent.report.durationMs,
              agentCount: completedEvent.report.agentCount,
              hasMarkdown: true as const,
            },
          }
        : {}),
      ...(failedEvent
        ? {
            failure: {
              error: failedEvent.error,
              failedAt: failedEvent.failedAt,
            },
          }
        : {}),
    };
  }

  private trimTrailingSlashes(value: string): string {
    let end = value.length;
    while (end > 1 && value.charCodeAt(end - 1) === 47) {
      end -= 1;
    }

    return value.slice(0, end);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeWebhookPath(path: string): string {
    const normalizedPath = this.trimTrailingSlashes(path);
    if (this.isWebhookPath(normalizedPath)) {
      return normalizedPath;
    }

    if (normalizedPath === '/') {
      return '/v1/security-penetration-tests/webhook';
    }

    return `${normalizedPath}/v1/security-penetration-tests/webhook`;
  }

  private isWebhookPath(path: string): boolean {
    return (
      path.endsWith('/security-penetration-tests/webhook') ||
      path.endsWith('/v1/security-penetration-tests/webhook') ||
      path.endsWith('/api/security/penetration-tests/webhook')
    );
  }

  private resolveWebhookUrl(
    organizationId: string,
    providedUrl?: string,
  ): string | undefined {
    const baseUrl = (providedUrl ?? this.defaultWebhookBase)?.trim();
    if (!baseUrl) {
      return undefined;
    }

    let webhookUrl: URL;
    try {
      webhookUrl = new URL(baseUrl);
    } catch {
      throw new BadRequestException('webhookUrl must be a valid absolute URL');
    }
    webhookUrl.pathname = this.normalizeWebhookPath(webhookUrl.pathname);
    webhookUrl.searchParams.set('orgId', organizationId);
    webhookUrl.searchParams.delete('webhookToken');

    return webhookUrl.toString();
  }

  private extractStringField(
    payload: unknown,
    key: string,
  ): string | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    const value = payload[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private extractNumberField(
    payload: unknown,
    key: string,
  ): number | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    const value = payload[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private extractCompletedWebhookPayload(
    payload: unknown,
  ): PentestCompletedWebhookPayload | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    const reportId = this.extractStringField(payload, 'id');
    const reportValue = payload.report;
    const isReportRecord = this.isRecord(reportValue);

    if (!reportId || !isReportRecord) {
      return null;
    }

    const reportRecord = reportValue as Record<string, unknown>;
    const markdown = this.extractStringField(reportRecord, 'markdown');
    const costUsd = this.extractNumberField(reportRecord, 'costUsd');
    const durationMs = this.extractNumberField(reportRecord, 'durationMs');
    const agentCount = this.extractNumberField(reportRecord, 'agentCount');

    if (
      !markdown ||
      costUsd === undefined ||
      durationMs === undefined ||
      agentCount === undefined ||
      !Number.isInteger(agentCount)
    ) {
      return null;
    }

    return {
      id: reportId,
      report: {
        markdown,
        costUsd,
        durationMs,
        agentCount,
      },
    };
  }

  private extractFailedWebhookPayload(
    payload: unknown,
  ): PentestFailedWebhookPayload | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    const reportId = this.extractStringField(payload, 'id');
    const error = this.extractStringField(payload, 'error');
    const failedAt = this.extractStringField(payload, 'failedAt');

    if (!reportId || !error || !failedAt) {
      return null;
    }

    return {
      id: reportId,
      error,
      failedAt,
    };
  }

  private hashValue(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private hashesEqual(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'hex');
    const bBuffer = Buffer.from(b, 'hex');

    if (aBuffer.length !== bBuffer.length) {
      return false;
    }

    return timingSafeEqual(aBuffer, bBuffer);
  }

  private webhookHandshakeSecretName(reportId: string): string {
    return `security_penetration_test_webhook_${reportId}`;
  }

  private async persistRunOwnership(
    organizationId: string,
    reportId: string,
  ): Promise<void> {
    await db.securityPenetrationTestRun.upsert({
      where: {
        organizationId_providerRunId: {
          organizationId,
          providerRunId: reportId,
        },
      },
      create: {
        organizationId,
        providerRunId: reportId,
      },
      update: {
        organizationId,
      },
    });
  }

  private async persistRunOwnershipWithRetry(
    organizationId: string,
    reportId: string,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.persistRunOwnership(organizationId, reportId);
        return true;
      } catch (error) {
        this.logger.error(
          `Unable to persist ownership marker for report ${reportId} (attempt ${attempt}/3)`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return false;
  }

  private async assertRunOwnership(
    organizationId: string,
    reportId: string,
  ): Promise<void> {
    const marker = await db.securityPenetrationTestRun.findUnique({
      where: {
        organizationId_providerRunId: {
          organizationId,
          providerRunId: reportId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!marker) {
      throw new HttpException(
        { error: 'Report not found' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async listOwnedRunIds(organizationId: string): Promise<Set<string>> {
    const markers = (await db.securityPenetrationTestRun.findMany({
      where: {
        organizationId,
      },
      select: {
        providerRunId: true,
      },
    })) ?? [];

    return new Set(markers.map(({ providerRunId }) => providerRunId));
  }

  private isCompWebhookUrl(value: string): boolean {
    if (!/^https?:\/\//.test(value)) {
      const [rawPath] = value.split('?');
      return this.isWebhookPath(this.trimTrailingSlashes(rawPath));
    }

    try {
      const parsed = new URL(value);
      return this.isWebhookPath(this.trimTrailingSlashes(parsed.pathname));
    } catch {
      return false;
    }
  }

  private parseWebhookHandshake(
    rawValue: string,
  ): PersistedWebhookHandshake | null {
    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      const tokenHash =
        typeof parsed.tokenHash === 'string' &&
        parsed.tokenHash.trim().length > 0
          ? parsed.tokenHash.trim()
          : undefined;
      const createdAt =
        typeof parsed.createdAt === 'string' &&
        parsed.createdAt.trim().length > 0
          ? parsed.createdAt.trim()
          : undefined;

      if (!tokenHash || !createdAt) {
        return null;
      }

      return {
        tokenHash,
        createdAt,
        ...(typeof parsed.lastEventId === 'string'
          ? { lastEventId: parsed.lastEventId }
          : {}),
        ...(typeof parsed.lastPayloadHash === 'string'
          ? { lastPayloadHash: parsed.lastPayloadHash }
          : {}),
        ...(typeof parsed.lastWebhookAt === 'string'
          ? { lastWebhookAt: parsed.lastWebhookAt }
          : {}),
      };
    } catch {
      return null;
    }
  }

  private async persistWebhookHandshake(
    organizationId: string,
    reportId: string,
    webhookToken: string,
  ): Promise<void> {
    const handshakeState: PersistedWebhookHandshake = {
      tokenHash: this.hashValue(webhookToken),
      createdAt: new Date().toISOString(),
    };

    await db.secret.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: this.webhookHandshakeSecretName(reportId),
        },
      },
      create: {
        organizationId,
        name: this.webhookHandshakeSecretName(reportId),
        category: 'webhook',
        description: 'Maced penetration test webhook handshake',
        value: JSON.stringify(handshakeState),
      },
      update: {
        category: 'webhook',
        description: 'Maced penetration test webhook handshake',
        value: JSON.stringify(handshakeState),
        lastUsedAt: null,
      },
    });
  }

  private async persistWebhookHandshakeWithRetry(
    organizationId: string,
    reportId: string,
    webhookToken: string,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.persistWebhookHandshake(organizationId, reportId, webhookToken);
        return true;
      } catch (error) {
        this.logger.error(
          `Unable to persist webhook handshake for report ${reportId} (attempt ${attempt}/3)`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return false;
  }

  private async verifyAndRecordWebhookHandshake(params: {
    organizationId: string;
    reportId: string;
    payload: Record<string, unknown>;
    webhookToken?: string;
    eventId?: string;
  }): Promise<boolean> {
    await this.assertRunOwnership(params.organizationId, params.reportId);

    const storedHandshake = await db.secret.findUnique({
      where: {
        organizationId_name: {
          organizationId: params.organizationId,
          name: this.webhookHandshakeSecretName(params.reportId),
        },
      },
      select: {
        id: true,
        value: true,
      },
    });

    if (!storedHandshake) {
      throw new ForbiddenException('Webhook handshake not found for report');
    }

    const handshakeState = this.parseWebhookHandshake(storedHandshake.value);
    if (!handshakeState) {
      throw new ForbiddenException('Invalid webhook handshake state');
    }

    if (!params.webhookToken) {
      throw new ForbiddenException('Missing webhook token');
    }

    if (
      !this.hashesEqual(
        this.hashValue(params.webhookToken),
        handshakeState.tokenHash,
      )
    ) {
      throw new ForbiddenException('Invalid webhook token');
    }

    const payloadHash = this.hashValue(JSON.stringify(params.payload));
    const duplicateByEventId =
      Boolean(params.eventId) && handshakeState.lastEventId === params.eventId;
    const duplicateByPayload =
      !params.eventId && handshakeState.lastPayloadHash === payloadHash;
    const duplicate = duplicateByEventId || duplicateByPayload;

    const nextHandshakeState: PersistedWebhookHandshake = {
      ...handshakeState,
      lastPayloadHash: payloadHash,
      lastWebhookAt: new Date().toISOString(),
      ...(params.eventId ? { lastEventId: params.eventId } : {}),
    };

    await db.secret.update({
      where: {
        id: storedHandshake.id,
      },
      data: {
        value: JSON.stringify(nextHandshakeState),
        lastUsedAt: new Date(),
      },
    });

    return duplicate;
  }

  async validateWebhookOrganization(
    organizationId: string | undefined,
  ): Promise<string> {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required for webhook payload');
    }
    return organizationId;
  }
}
