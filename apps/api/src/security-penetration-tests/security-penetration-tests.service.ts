import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { db } from '@db';
import { createHash, timingSafeEqual } from 'node:crypto';

import { CredentialVaultService } from '../integration-platform/services/credential-vault.service';
import type { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import {
  MacedClient,
  type MacedCreatePentestRun,
  type MacedPentestProgress,
  type MacedPentestRun,
} from './maced-client';

export interface GithubRepo {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
}

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
  targetUrl: string;
  repoUrl?: string | null;
  status: PentestReportStatus;
  testMode?: boolean | null;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
  failedReason?: string | null;
  temporalUiUrl?: string | null;
  webhookUrl?: string | null;
  notificationEmail?: string | null;
  progress?: PentestProgress;
}

export interface BinaryArtifact {
  buffer: Buffer;
  contentType: string;
  contentDisposition?: string | null;
}

interface PentestCompletedWebhookPayload {
  runId: string;
  report: {
    markdown: string;
    costUsd: number;
    durationMs: number;
    agentCount: number;
  };
}

interface PentestFailedWebhookPayload {
  runId: string;
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

  constructor(private readonly credentialVaultService: CredentialVaultService) {}

  private readonly canonicalWebhookPath = '/v1/security-penetration-tests/webhook';
  private readonly defaultWebhookBaseUrl = 'https://api.trycomp.ai';
  private readonly defaultCompWebhookHosts = new Set([
    'api.trycomp.ai',
    'api.staging.trycomp.ai',
    'localhost:3333',
  ]);

  private get defaultWebhookBase() {
    return (
      process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL?.trim() ||
      this.defaultWebhookBaseUrl
    );
  }

  async listReports(organizationId: string): Promise<SecurityPenetrationTest[]> {
    const ownedRunIds = await this.listOwnedRunIds(organizationId);
    if (ownedRunIds.size === 0) {
      return [];
    }

    const reports = await this.macedClient.listPentests();

    return reports.filter((report) => {
      return ownedRunIds.has(report.id);
    }).map((report) => this.mapMacedRunToSecurityPenetrationTest(report));
  }

  async createReport(
    organizationId: string,
    payload: CreatePenetrationTestDto,
  ): Promise<SecurityPenetrationTest> {
    const resolvedWebhookUrl = this.resolveWebhookUrl(payload.webhookUrl);

    const sanitizedPayload: {
      targetUrl: string;
      repoUrl?: string;
      githubToken?: string;
      configYaml?: string;
      pipelineTesting?: boolean;
      testMode?: boolean;
      workspace?: string;
      webhookUrl?: string;
    } = {
      targetUrl: payload.targetUrl,
      repoUrl: payload.repoUrl,
      githubToken: payload.githubToken,
      configYaml: payload.configYaml,
      pipelineTesting: payload.pipelineTesting,
      testMode: payload.testMode,
      workspace: payload.workspace,
      webhookUrl: resolvedWebhookUrl,
    };

    if (
      payload.repoUrl?.startsWith('https://github.com/') &&
      !sanitizedPayload.githubToken
    ) {
      sanitizedPayload.githubToken =
        (await this.getGithubTokenForOrg(organizationId)) ?? undefined;
    }

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

    return this.mapMacedRunToSecurityPenetrationTest(createdReport);
  }

  async listGithubRepos(
    organizationId: string,
  ): Promise<{ repos: GithubRepo[]; connected: boolean }> {
    const token = await this.getGithubTokenForOrg(organizationId);
    if (!token) {
      return { repos: [], connected: false };
    }

    try {
      const response = await fetch(
        'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `GitHub repos API returned ${response.status} for org=${organizationId}`,
        );
        return { repos: [], connected: true };
      }

      const raw = (await response.json()) as Array<Record<string, unknown>>;
      const repos: GithubRepo[] = raw.map((r) => ({
        id: r.id as number,
        name: r.name as string,
        fullName: r.full_name as string,
        private: r.private as boolean,
        htmlUrl: r.html_url as string,
      }));

      return { repos, connected: true };
    } catch (error) {
      this.logger.error(
        `Failed to fetch GitHub repos for org=${organizationId}`,
        error instanceof Error ? error.message : String(error),
      );
      return { repos: [], connected: true };
    }
  }

  async getReport(organizationId: string, id: string): Promise<SecurityPenetrationTest> {
    await this.assertRunOwnership(organizationId, id);
    const report = await this.macedClient.getPentest(id);
    return this.mapMacedRunToSecurityPenetrationTest(report);
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
      completedEvent?.runId ??
      failedEvent?.runId ??
      this.extractStringField(payload, 'runId');

    if (!payloadReportId) {
      throw new BadRequestException('Webhook payload must include a report id');
    }

    const organizationId = await this.resolveOrganizationForRun(payloadReportId);

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

  private async getGithubTokenForOrg(organizationId: string): Promise<string | null> {
    try {
      const provider = await db.integrationProvider.findUnique({
        where: { slug: 'github' },
        select: { id: true },
      });

      if (!provider) {
        return null;
      }

      const connection = await db.integrationConnection.findFirst({
        where: {
          providerId: provider.id,
          organizationId,
          status: 'active',
        },
        select: { id: true },
      });

      if (!connection) {
        return null;
      }

      const credentials = await this.credentialVaultService.getDecryptedCredentials(
        connection.id,
      );

      const token = credentials?.access_token;
      return typeof token === 'string' && token.length > 0 ? token : null;
    } catch (error) {
      this.logger.warn(
        `Could not retrieve GitHub token for org=${organizationId}`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private trimTrailingSlashes(value: string): string {
    let end = value.length;
    while (end > 1 && value.charCodeAt(end - 1) === 47) {
      end -= 1;
    }

    return value.slice(0, end);
  }

  private mapMacedRunToSecurityPenetrationTest(
    report: MacedPentestRun | MacedCreatePentestRun,
  ): SecurityPenetrationTest {
    const failedReason = report.error ?? null;

    return {
      ...(report as SecurityPenetrationTest),
      failedReason,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private normalizeWebhookPath(path: string): string {
    const normalizedPath = this.trimTrailingSlashes(path);
    if (normalizedPath.endsWith(this.canonicalWebhookPath)) {
      return normalizedPath;
    }

    const legacySuffixes = [
      '/security-penetration-tests/webhook',
      '/api/security/penetration-tests/webhook',
    ] as const;

    for (const suffix of legacySuffixes) {
      if (normalizedPath.endsWith(suffix)) {
        const basePath = normalizedPath.slice(0, normalizedPath.length - suffix.length);
        return basePath
          ? `${basePath}${this.canonicalWebhookPath}`
          : this.canonicalWebhookPath;
      }
    }

    if (normalizedPath === '/') {
      return this.canonicalWebhookPath;
    }

    return `${normalizedPath}${this.canonicalWebhookPath}`;
  }

  private isWebhookPath(path: string): boolean {
    return path.endsWith(this.canonicalWebhookPath);
  }

  private resolveWebhookUrl(
    providedUrl?: string,
  ): string | undefined {
    const baseUrl = providedUrl?.trim() || this.defaultWebhookBase;
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

    const reportId = this.extractStringField(payload, 'runId');
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
      runId: reportId,
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

    const reportId = this.extractStringField(payload, 'runId');
    const error = this.extractStringField(payload, 'error');
    const failedAt = this.extractStringField(payload, 'failedAt');

    if (!reportId || !error || !failedAt) {
      return null;
    }

    return {
      runId: reportId,
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
        providerRunId: reportId,
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
    const ownerOrganizationId = await this.resolveOrganizationForRun(
      reportId,
      new HttpException(
        { error: 'Report not found' },
        HttpStatus.NOT_FOUND,
      ),
    );

    if (ownerOrganizationId !== organizationId) {
      throw new HttpException(
        { error: 'Report not found' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async resolveOrganizationForRun(
    reportId: string,
    notFoundError: Error = new ForbiddenException('Run ownership mapping not found'),
  ): Promise<string> {
    const marker = await db.securityPenetrationTestRun.findUnique({
      where: {
        providerRunId: reportId,
      },
      select: {
        organizationId: true,
      },
    });

    if (!marker) {
      throw notFoundError;
    }

    return marker.organizationId;
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
    try {
      const parsed = new URL(value);
      const normalizedPath = this.trimTrailingSlashes(parsed.pathname);
      if (!this.isWebhookPath(normalizedPath)) {
        return false;
      }

      return this.trustedCompWebhookHosts().has(parsed.host.toLowerCase());
    } catch {
      return false;
    }
  }

  private trustedCompWebhookHosts(): Set<string> {
    const hosts = new Set(this.defaultCompWebhookHosts);
    const configuredUrls = [
      process.env.SECURITY_PENETRATION_TESTS_WEBHOOK_URL,
      process.env.BASE_URL,
      process.env.APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
    ];

    for (const configuredUrl of configuredUrls) {
      const candidate = configuredUrl?.trim();
      if (!candidate) {
        continue;
      }

      try {
        hosts.add(new URL(candidate).host.toLowerCase());
      } catch {
        this.logger.warn(`Ignoring invalid trusted webhook host URL: ${candidate}`);
      }
    }

    return hosts;
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
}
