import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { db } from '@db';
import {
  createMacedClient,
  MacedApiError,
  MacedClient,
  MacedWebhookSignatureError,
  type CreatePentestBody,
  type Issue,
  type MacedWebhookEvent,
  type Pentest,
  type PentestCreated,
  type PentestEvent,
  type PentestProgress as MacedPentestProgress,
  type PentestWithProgress,
} from '@maced/api-client';

import type { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';

export type PentestReportStatus =
  | 'provisioning'
  | 'cloning'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Alias the SDK progress type so callers inside this module don't import from
// the SDK directly.
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

@Injectable()
export class SecurityPenetrationTestsService {
  private readonly logger = new Logger(SecurityPenetrationTestsService.name);
  private readonly macedClient: MacedClient;

  constructor() {
    const apiKey = process.env.MACED_API_KEY;
    if (!apiKey) {
      // Throw at construction so the app fails loudly on boot, not on first request.
      throw new Error('MACED_API_KEY is required to start the pentest module');
    }
    this.macedClient = createMacedClient({
      apiKey,
      baseUrl: process.env.MACED_API_BASE_URL,
      userAgent: 'comp-api',
    });
  }

  /**
   * Wraps a Maced SDK call so MacedApiError is translated into a NestJS
   * HttpException that preserves the upstream status code. Non-API errors
   * (network / unexpected) are mapped to 502 BAD_GATEWAY but we surface as
   * much detail as we can so the frontend toast is actually useful.
   */
  private async callMaced<T>(
    fn: () => Promise<T>,
    context: string,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof MacedApiError) {
        const body =
          typeof error.body === 'object' && error.body !== null
            ? (error.body as { error?: string; message?: string })
            : undefined;
        const upstreamMessage =
          body?.error ??
          body?.message ??
          (typeof error.body === 'string' ? error.body : null) ??
          error.message;
        this.logger.error(
          `Maced API error (${context}): ${error.status} ${upstreamMessage}`,
        );
        throw new HttpException(
          { error: upstreamMessage, source: 'maced', status: error.status },
          error.status,
        );
      }
      // Non-API throw (timeout, DNS, malformed body the SDK couldn't parse,
      // …). Include the constructor name + message in the log so we can tell
      // what actually broke without a debugger.
      const errName = error?.constructor?.name ?? typeof error;
      const errMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transport failure calling Maced (${context}): ${errName} — ${errMessage}`,
      );
      throw new HttpException(
        {
          error: `Provider call failed (${context}): ${errMessage}`,
          source: 'transport',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private readonly canonicalWebhookPath =
    '/v1/security-penetration-tests/webhook';
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

  async listReports(
    organizationId: string,
  ): Promise<SecurityPenetrationTest[]> {
    const ownedRunIds = await this.listOwnedRunIds(organizationId);
    if (ownedRunIds.size === 0) {
      return [];
    }

    const reports = await this.callMaced(
      () => this.macedClient.pentests.list(),
      'listing penetration tests',
    );

    return reports
      .filter((report) => ownedRunIds.has(report.id))
      .map((report) => this.mapMacedRunToSecurityPenetrationTest(report));
  }

  async createReport(
    organizationId: string,
    payload: CreatePenetrationTestDto,
  ): Promise<SecurityPenetrationTest> {
    const resolvedWebhookUrl = this.resolveWebhookUrl(payload.webhookUrl);

    // Public repos only. We deliberately do NOT auto-attach the org's
    // GitHub OAuth token — that would silently share Comp customer creds
    // with a third-party vendor. Private-repo support belongs behind an
    // explicit, scoped credential mechanism (e.g., GitHub App installation
    // tokens), not a quiet OAuth-token forward.
    const body: CreatePentestBody = {
      targetUrl: payload.targetUrl,
      ...(payload.repoUrl ? { repoUrl: payload.repoUrl } : {}),
      ...(payload.pipelineTesting !== undefined
        ? { pipelineTesting: payload.pipelineTesting }
        : {}),
      ...(payload.testMode !== undefined ? { testMode: payload.testMode } : {}),
      ...(resolvedWebhookUrl ? { webhookUrl: resolvedWebhookUrl } : {}),
      // Attribution metadata — Maced persists this verbatim and returns it on
      // list/get. Gives us a second source of truth for the org↔run mapping
      // (our `security_penetration_test_runs` table is the primary one) so
      // ownership can be reconstructed from Maced if our DB ever drifts.
      metadata: {
        compOrganizationId: organizationId,
        compEnvironment:
          process.env.NODE_ENV === 'production' ? 'production' : 'development',
        compApiVersion: '1',
      },
    };

    const createdReport = await this.callMaced(
      () => this.macedClient.pentests.create(body),
      'creating penetration test',
    );

    const providerRunId = createdReport.id;
    if (!providerRunId) {
      throw new HttpException(
        { error: 'Create response missing report identifier' },
        HttpStatus.BAD_GATEWAY,
      );
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

    // Maced's POST /v1/pentests returns only { id, status } — backfill the
    // rest from the user's payload so the return shape honors its type and
    // the frontend renders real values before the first GET /:id poll
    // hydrates the full run detail.
    const now = new Date().toISOString();
    return {
      id: providerRunId,
      status: createdReport.status,
      targetUrl: payload.targetUrl,
      repoUrl: payload.repoUrl ?? null,
      testMode: payload.testMode ?? null,
      createdAt: now,
      updatedAt: now,
      error: null,
      failedReason: null,
      temporalUiUrl: null,
      webhookUrl: resolvedWebhookUrl ?? null,
      notificationEmail: null,
    };
  }

  async getReport(
    organizationId: string,
    id: string,
  ): Promise<SecurityPenetrationTest> {
    await this.assertRunOwnership(organizationId, id);
    const report = await this.callMaced(
      () => this.macedClient.pentests.get(id),
      `fetching penetration test ${id}`,
    );
    return this.mapMacedRunToSecurityPenetrationTest(report);
  }

  async getReportProgress(
    organizationId: string,
    id: string,
  ): Promise<PentestProgress> {
    await this.assertRunOwnership(organizationId, id);
    return this.callMaced(
      () => this.macedClient.pentests.progress(id),
      `fetching penetration test progress ${id}`,
    );
  }

  async getReportIssues(
    organizationId: string,
    id: string,
  ): Promise<Issue[]> {
    await this.assertRunOwnership(organizationId, id);
    return this.callMaced(
      () => this.macedClient.pentests.issues(id),
      `fetching penetration test issues ${id}`,
    );
  }

  async getReportEvents(
    organizationId: string,
    id: string,
  ): Promise<PentestEvent[]> {
    await this.assertRunOwnership(organizationId, id);
    return this.callMaced(
      () => this.macedClient.pentests.events(id),
      `fetching penetration test events ${id}`,
    );
  }

  async getReportOutput(
    organizationId: string,
    id: string,
  ): Promise<BinaryArtifact> {
    await this.getReport(organizationId, id);

    const report = await this.callMaced(
      () => this.macedClient.pentests.report(id),
      `fetching penetration test report ${id}`,
    );

    return {
      buffer: Buffer.from(report.markdown, 'utf-8'),
      contentType: 'text/markdown; charset=utf-8',
      contentDisposition: null,
    };
  }

  async getReportPdf(
    organizationId: string,
    id: string,
  ): Promise<BinaryArtifact> {
    await this.getReport(organizationId, id);

    const blob = await this.callMaced(
      () => this.macedClient.pentests.reportPdf(id),
      `fetching penetration test PDF ${id}`,
    );

    return {
      buffer: Buffer.from(await blob.arrayBuffer()),
      contentType: blob.type || 'application/pdf',
      contentDisposition: `attachment; filename="penetration-test-${id}.pdf"`,
    };
  }

  async handleWebhook(params: {
    rawBody: Buffer | undefined;
    signatureHeader: string | undefined;
  }): Promise<{
    success: true;
    eventType: string;
    eventId?: string;
  }> {
    if (!params.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    const secret = process.env.MACED_WEBHOOK_SIGNING_SECRET;
    if (!secret) {
      this.logger.error(
        'MACED_WEBHOOK_SIGNING_SECRET is not configured — rejecting webhook',
      );
      throw new HttpException(
        { error: 'Webhook signing secret not configured on server' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let event: MacedWebhookEvent;
    try {
      event = await MacedClient.webhooks.constructEvent(
        params.rawBody,
        params.signatureHeader ?? null,
        secret,
      );
    } catch (error) {
      if (error instanceof MacedWebhookSignatureError) {
        this.logger.warn(
          `[Webhook] Signature verification failed: ${error.code}`,
        );
        throw new ForbiddenException('Invalid webhook signature');
      }
      throw error;
    }

    // event is a proper discriminated union — narrow on event.type to access
    // event-specific data shape. See @maced/api-client WebhookEvent.
    const issueId =
      event.type === 'issue.created' || event.type === 'issue.status_changed'
        ? event.data.issueId
        : undefined;

    this.logger.log(
      `[Webhook] ${event.type} id=${event.id} pentest=${event.data.pentestId}` +
        (issueId ? ` issue=${issueId}` : ''),
    );

    return {
      success: true,
      eventType: event.type,
      eventId: event.id,
    };
  }

  private trimTrailingSlashes(value: string): string {
    let end = value.length;
    while (end > 1 && value.charCodeAt(end - 1) === 47) {
      end -= 1;
    }

    return value.slice(0, end);
  }

  private mapMacedRunToSecurityPenetrationTest(
    report: Pentest | PentestWithProgress | PentestCreated,
  ): SecurityPenetrationTest {
    // PentestCreated only has { id, status } — the backfill in createReport
    // already handles that case directly. Here we handle the full run shapes
    // returned by list/get.
    if (!('targetUrl' in report)) {
      return {
        id: report.id,
        status: report.status,
        targetUrl: '',
        createdAt: '',
        updatedAt: '',
        error: null,
        failedReason: null,
        repoUrl: null,
        testMode: null,
        temporalUiUrl: null,
        webhookUrl: null,
        notificationEmail: null,
      };
    }

    return {
      id: report.id,
      status: report.status,
      targetUrl: report.targetUrl,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      error: report.error ?? null,
      failedReason: report.error ?? null,
      repoUrl: report.repoUrl ?? null,
      testMode: report.testMode ?? null,
      temporalUiUrl: null,
      webhookUrl: report.webhookUrl ?? null,
      notificationEmail: report.notificationEmail ?? null,
      ...('progress' in report ? { progress: report.progress } : {}),
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
        const basePath = normalizedPath.slice(
          0,
          normalizedPath.length - suffix.length,
        );
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

  private resolveWebhookUrl(providedUrl?: string): string | undefined {
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
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  private extractNumberField(
    payload: unknown,
    key: string,
  ): number | undefined {
    if (!this.isRecord(payload)) {
      return undefined;
    }

    const value = payload[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
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

    const reportRecord = reportValue;
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
      new HttpException({ error: 'Report not found' }, HttpStatus.NOT_FOUND),
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
    notFoundError: Error = new ForbiddenException(
      'Run ownership mapping not found',
    ),
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
    const markers =
      (await db.securityPenetrationTestRun.findMany({
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
        this.logger.warn(
          `Ignoring invalid trusted webhook host URL: ${candidate}`,
        );
      }
    }

    return hosts;
  }

}
