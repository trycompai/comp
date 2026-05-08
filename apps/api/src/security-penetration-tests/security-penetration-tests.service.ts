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
import { randomUUID } from 'crypto';

import type { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import {
  evidenceLevelValues,
  pentestCheckValues,
  scanDepthValues,
  type EvidenceLevel,
  type PentestCheck,
  type ScanDepth,
} from './dto/create-penetration-test.dto';
import { BillingEntitlementsService } from '../billing/billing-entitlements.service';
import { PentestCreditsService } from './pentest-credits.service';

/**
 * Drops events that mention our infrastructure provider in any string
 * field. Matches the same predicate as the frontend's
 * `isCustomerVisible`, but applied at the API layer so the filter
 * cannot be bypassed by a non-browser client (curl, DevTools, custom
 * SDK consumer). The events still exist in our internal logs.
 */
function isCustomerVisibleEvent(event: PentestEvent): boolean {
  const e = event as PentestEvent & {
    agent?: unknown;
    tool?: unknown;
    summary?: unknown;
    description?: unknown;
    raw?: unknown;
  };
  if (typeof e.tool === 'string' && e.tool === 'TodoWrite') return false;
  const fields: unknown[] = [e.agent, e.tool, e.summary, e.description, e.raw];
  for (const field of fields) {
    if (typeof field === 'string' && field.toLowerCase().includes('maced')) {
      return false;
    }
  }
  return true;
}

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
  scanDepth?: ScanDepth;
  evidenceLevel?: EvidenceLevel;
  checks?: PentestCheck[];
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

type CreatePentestBodyWithScanProfile = CreatePentestBody & {
  scanDepth?: ScanDepth;
  evidenceLevel?: EvidenceLevel;
  checks?: PentestCheck[];
};

@Injectable()
export class SecurityPenetrationTestsService {
  private readonly logger = new Logger(SecurityPenetrationTestsService.name);
  private readonly macedClient: MacedClient;

  constructor(
    private readonly credits: PentestCreditsService,
    private readonly billingEntitlements: BillingEntitlementsService,
  ) {
    const apiKey = process.env.MACED_API_KEY;
    if (!apiKey) {
      // Throw at construction so the app fails loudly on boot, not on first request.
      throw new Error('MACED_API_KEY is required to start the pentest module');
    }
    this.macedClient = createMacedClient({
      apiKey,
      baseUrl: process.env.MACED_API_BASE_URL,
      userAgent: 'comp-api',
      // Disable SDK-level retries. The 0.9.1 retry wrapper reuses the same
      // Request object across attempts, which throws "Cannot construct a
      // Request with a Request object that has already been used" on any
      // retriable status (408/425/429/500/502/503/504) when the request
      // has a body. The cryptic error masks the real upstream failure.
      // We retry where it matters at the application layer (ownership
      // persistence in createReport).
      retry: { maxAttempts: 1 },
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
      const errMessage = error instanceof Error ? error.message : String(error);
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
    const billingUsageSourceId = `pending:${randomUUID()}`;
    let consumedSubscriptionAllowance = false;

    // Reserve subscription allowance before calling Maced so fast double-clicks
    // cannot create more paid provider runs than the organization has available.
    try {
      const subscriptionUsage =
        await this.billingEntitlements.tryConsumeIncludedUsageForProduct({
          organizationId,
          productKey: 'pentest',
          sourceResourceId: billingUsageSourceId,
        });
      if (subscriptionUsage.status === 'exhausted') {
        throw new HttpException(
          {
            error:
              'No pentest runs remaining in your subscription. Upgrade or wait for your monthly allowance to reset.',
            code: 'pentest_subscription_exhausted',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      if (subscriptionUsage.status === 'not_configured') {
        throw new HttpException(
          {
            error: 'Start a penetration test plan or free trial to run scans.',
            code: 'pentest_subscription_required',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      } else {
        consumedSubscriptionAllowance = true;
      }
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.PAYMENT_REQUIRED
      ) {
        // Record the blocked attempt so support / compliance can answer
        // "did the user try to scan without an allowance?". Best-
        // effort — never let an audit-log failure hide the 402 from the
        // user.
        const response = error.getResponse();
        const reason = getPaymentRequiredCode(response);
        await this.credits.writePentestAuditEntry({
          organizationId,
          action: 'pentest_create_blocked',
          runId: null,
          description:
            reason === 'pentest_subscription_exhausted'
              ? 'Pentest create blocked: subscription exhausted'
              : 'Pentest create blocked: subscription required',
          metadata: {
            reason,
            targetUrl: payload.targetUrl,
          },
        });
      }
      throw error;
    }

    // Public repos only. We deliberately do NOT auto-attach the org's
    // GitHub OAuth token — that would silently share Comp customer creds
    // with a third-party vendor. Private-repo support belongs behind an
    // explicit, scoped credential mechanism (e.g., GitHub App installation
    // tokens), not a quiet OAuth-token forward.
    const body: CreatePentestBodyWithScanProfile = {
      targetUrl: payload.targetUrl,
      ...(payload.repoUrl ? { repoUrl: payload.repoUrl } : {}),
      ...(payload.pipelineTesting !== undefined
        ? { pipelineTesting: payload.pipelineTesting }
        : {}),
      ...(payload.testMode !== undefined ? { testMode: payload.testMode } : {}),
      ...(resolvedWebhookUrl ? { webhookUrl: resolvedWebhookUrl } : {}),
      ...(payload.scanDepth ? { scanDepth: payload.scanDepth } : {}),
      ...(payload.evidenceLevel
        ? { evidenceLevel: payload.evidenceLevel }
        : {}),
      ...(payload.checks ? { checks: payload.checks } : {}),
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

    let createdReport: PentestCreated;
    try {
      createdReport = await this.callMaced(
        () => this.macedClient.pentests.create(body),
        'creating penetration test',
      );
    } catch (error) {
      // Provider call failed after we debited. Refund so the user isn't
      // charged for a run that never started.
      if (consumedSubscriptionAllowance) {
        await this.refundBillingUsageQuietly({
          organizationId,
          sourceResourceId: billingUsageSourceId,
          reason: 'maced_create_failed',
        });
      } else {
        await this.refundQuietly(
          organizationId,
          'pending',
          'maced_create_failed',
        );
      }
      throw error;
    }

    const providerRunId = createdReport.id;
    if (!providerRunId) {
      if (consumedSubscriptionAllowance) {
        await this.refundBillingUsageQuietly({
          organizationId,
          sourceResourceId: billingUsageSourceId,
          reason: 'maced_missing_run_id',
        });
      } else {
        await this.refundQuietly(
          organizationId,
          'pending',
          'maced_missing_run_id',
        );
      }
      throw new HttpException(
        { error: 'Create response missing report identifier' },
        HttpStatus.BAD_GATEWAY,
      );
    }

    const ownershipPersisted = await this.persistRunOwnershipWithRetry(
      organizationId,
      providerRunId,
      consumedSubscriptionAllowance ? billingUsageSourceId : null,
    );
    if (!ownershipPersisted) {
      // We debited and Maced created the run, but our DB rejected the
      // ownership row 3x. Refund — the user can't see the run, so they
      // shouldn't pay for it. The Maced run is orphaned (no
      // ownership) but Maced has the `compOrganizationId` metadata if
      // support ever needs to clean it up.
      if (consumedSubscriptionAllowance) {
        await this.refundBillingUsageQuietly({
          organizationId,
          sourceResourceId: billingUsageSourceId,
          reason: 'ownership_persist_failed',
        });
      } else {
        await this.refundQuietly(
          organizationId,
          providerRunId,
          'ownership_persist_failed',
        );
      }
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
      ...(payload.scanDepth ? { scanDepth: payload.scanDepth } : {}),
      ...(payload.evidenceLevel
        ? { evidenceLevel: payload.evidenceLevel }
        : {}),
      ...(payload.checks ? { checks: payload.checks } : {}),
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

  async getReportIssues(organizationId: string, id: string): Promise<Issue[]> {
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
    const events = await this.callMaced(
      () => this.macedClient.pentests.events(id),
      `fetching penetration test events ${id}`,
    );
    // Filter at the API layer (defense in depth) — a UI-only filter
    // would leave Maced-internal tool names (`mcp__maced-helper__*`)
    // and any "Maced" prose mentions visible in the raw HTTP response,
    // i.e. accessible via DevTools / curl / a custom client. By
    // dropping these rows before they leave our server, the customer-
    // facing surface stays white-labeled regardless of consumer.
    return events.filter(isCustomerVisibleEvent);
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
      throw new BadRequestException(
        'Missing raw body for webhook verification',
      );
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

    // Refund the credit on terminal failure events. The user paid for a
    // run that didn't deliver value, so they shouldn't lose the credit.
    // Idempotent via the run row's `creditRefundedAt` column — webhook
    // redelivery cannot double-credit. If the refund transaction fails
    // (e.g. transient DB blip), the error propagates so this handler
    // returns 5xx and Maced redelivers the webhook — without that, the
    // customer would silently lose their credit.
    if (event.type === 'pentest.failed' || event.type === 'pentest.cancelled') {
      await this.refundOnTerminalFailure(event.data.pentestId, event.type);
    }

    // Successful completion deserves its own audit-log row so the
    // run's lifecycle is durably recorded ("scan completed for X with N
    // findings"). Without this the audit log shows the create but not
    // the result, and the only completion record is in NestJS logs /
    // Maced.
    if (event.type === 'pentest.completed') {
      await this.auditPentestCompleted(event.data);
    }

    return {
      success: true,
      eventType: event.type,
      eventId: event.id,
    };
  }

  /**
   * Look up the run's owning org and write a `pentest_completed` audit
   * row. Quiet on orphan runs (no ownership row → can't attribute) —
   * those are rare race-condition artifacts and don't represent
   * customer-visible state.
   */
  private async auditPentestCompleted(data: {
    pentestId: string;
    targetUrl: string;
    issueCount: number;
    durationMs: number;
    agentCount: number;
  }): Promise<void> {
    // Atomic claim — only the first webhook delivery for this run gets
    // count: 1 back. Subsequent redeliveries see `completed_audit_at`
    // already set and bail out before writing a duplicate audit row.
    const claimed = await db.securityPenetrationTestRun.updateMany({
      where: {
        providerRunId: data.pentestId,
        completedAuditAt: null,
      },
      data: { completedAuditAt: new Date() },
    });
    if (claimed.count === 0) {
      // Either no ownership row (orphan) or this completion event has
      // already been audited. Either way: silent no-op.
      this.logger.log(
        `[Webhook] pentest.completed audit skipped run=${data.pentestId} (no ownership row or already audited)`,
      );
      return;
    }

    const run = await db.securityPenetrationTestRun.findUnique({
      where: { providerRunId: data.pentestId },
      select: { organizationId: true },
    });
    if (!run) {
      // Race: the row vanished between updateMany and findUnique.
      // Vanishingly rare; log and bail.
      this.logger.warn(
        `[Webhook] pentest.completed run row vanished after claim run=${data.pentestId}`,
      );
      return;
    }

    await this.credits.writePentestAuditEntry({
      organizationId: run.organizationId,
      action: 'pentest_completed',
      runId: data.pentestId,
      description: `Pentest completed for ${data.targetUrl} — ${data.issueCount} finding${data.issueCount === 1 ? '' : 's'}, ${this.formatDurationMs(data.durationMs)}`,
      metadata: {
        targetUrl: data.targetUrl,
        issueCount: data.issueCount,
        durationMs: data.durationMs,
        agentCount: data.agentCount,
      },
    });
  }

  /**
   * Atomically marks the run as refunded and credits the org's wallet.
   * The conditional `where: { creditRefundedAt: null }` ensures the
   * second delivery of the same event sees the marker and short-circuits
   * — the wallet stays correct even if Maced retries the webhook.
   */
  private async refundOnTerminalFailure(
    providerRunId: string,
    eventType: 'pentest.failed' | 'pentest.cancelled',
  ): Promise<void> {
    // Wrap claim + refund in a single transaction so a refund failure
    // rolls back the claim. Without this, a transient DB blip on the
    // wallet write would leave `creditRefundedAt` set with no actual
    // refund, and webhook redelivery would short-circuit forever — the
    // customer never gets their credit back.
    //
    // Errors are NOT swallowed here — they propagate to handleWebhook
    // → Maced sees 5xx → redelivers the webhook. On the redelivery
    // the rolled-back `creditRefundedAt` is null again, so the claim
    // re-fires and the refund is retried.
    await db.$transaction(async (tx) => {
      const claimed = await tx.securityPenetrationTestRun.updateMany({
        where: { providerRunId, creditRefundedAt: null },
        data: { creditRefundedAt: new Date() },
      });

      if (claimed.count === 0) {
        // Either we don't own this run (orphan from a fast-click race
        // — ownership row never persisted) OR the credit has already
        // been refunded. Either way: do nothing further.
        this.logger.log(
          `[Webhook] ${eventType} refund skipped run=${providerRunId} (no ownership row or already refunded)`,
        );
        return;
      }

      const run = await tx.securityPenetrationTestRun.findUnique({
        where: { providerRunId },
        select: { organizationId: true, billingUsageSourceId: true },
      });
      if (!run) {
        // Vanishingly rare race; abort the transaction so the claim
        // rolls back. Webhook redelivery will retry.
        throw new Error(`Run row vanished after claim for ${providerRunId}`);
      }

      if (run.billingUsageSourceId) {
        await this.billingEntitlements.refundIncludedUsageForProduct({
          organizationId: run.organizationId,
          productKey: 'pentest',
          sourceResourceId: run.billingUsageSourceId,
          reason: eventType,
          tx,
        });
        return;
      }

      await this.credits.refund(
        run.organizationId,
        providerRunId,
        eventType,
        tx,
      );
    });
  }

  private formatDurationMs(ms: number): string {
    const totalMin = Math.max(Math.round(ms / 60_000), 0);
    const hours = Math.floor(totalMin / 60);
    const minutes = totalMin % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${totalMin}m`;
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
        ...this.getScanProfileFields(report),
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
      ...this.getScanProfileFields(report),
      ...('progress' in report ? { progress: report.progress } : {}),
    };
  }

  private getScanProfileFields(
    report: Pentest | PentestWithProgress | PentestCreated,
  ): Pick<SecurityPenetrationTest, 'scanDepth' | 'evidenceLevel' | 'checks'> {
    const record = report as unknown;
    if (!this.isRecord(record)) return {};

    const fields: Pick<
      SecurityPenetrationTest,
      'scanDepth' | 'evidenceLevel' | 'checks'
    > = {};

    if (this.isScanDepth(record.scanDepth)) {
      fields.scanDepth = record.scanDepth;
    }

    if (this.isEvidenceLevel(record.evidenceLevel)) {
      fields.evidenceLevel = record.evidenceLevel;
    }

    if (Array.isArray(record.checks)) {
      const checks = record.checks.filter((check): check is PentestCheck =>
        this.isPentestCheck(check),
      );
      if (checks.length === record.checks.length) {
        fields.checks = checks;
      }
    }

    return fields;
  }

  private isScanDepth(value: unknown): value is ScanDepth {
    return (
      typeof value === 'string' &&
      (scanDepthValues as readonly string[]).includes(value)
    );
  }

  private isEvidenceLevel(value: unknown): value is EvidenceLevel {
    return (
      typeof value === 'string' &&
      (evidenceLevelValues as readonly string[]).includes(value)
    );
  }

  private isPentestCheck(value: unknown): value is PentestCheck {
    return (
      typeof value === 'string' &&
      (pentestCheckValues as readonly string[]).includes(value)
    );
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

  /**
   * Refund a credit, swallowing any error so the caller's primary failure
   * path remains intact. The original error has already been logged by
   * the caller — losing the refund would be unfortunate but should never
   * promote into a different failure mode for the user.
   */
  private async refundQuietly(
    organizationId: string,
    runId: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.credits.refund(organizationId, runId, reason);
    } catch (error) {
      this.logger.error(
        `Refund failed for org=${organizationId} run=${runId} reason=${reason}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async refundBillingUsageQuietly(params: {
    organizationId: string;
    sourceResourceId: string;
    reason: string;
  }): Promise<void> {
    try {
      await this.billingEntitlements.refundIncludedUsageForProduct({
        organizationId: params.organizationId,
        productKey: 'pentest',
        sourceResourceId: params.sourceResourceId,
        reason: params.reason,
      });
    } catch (error) {
      this.logger.error(
        `Billing usage refund failed for org=${params.organizationId} source=${params.sourceResourceId} reason=${params.reason}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async persistRunOwnership(
    organizationId: string,
    reportId: string,
    billingUsageSourceId: string | null,
  ): Promise<void> {
    // Defensive: if a row already exists for this providerRunId, do NOT
    // overwrite its organizationId. Maced generates unique providerRunIds
    // per create, so in normal operation the create branch is the only
    // one that fires. But if any future bug or replay attempted to "take
    // over" an existing run by submitting it with a different orgId, the
    // empty `update: {}` ensures the original owner stays intact. The
    // upsert pattern (vs. plain create) is kept to make `createReport`
    // idempotent against retry-style transient errors.
    await db.securityPenetrationTestRun.upsert({
      where: {
        providerRunId: reportId,
      },
      create: {
        organizationId,
        providerRunId: reportId,
        billingUsageSourceId,
      },
      update: {},
    });
  }

  private async persistRunOwnershipWithRetry(
    organizationId: string,
    reportId: string,
    billingUsageSourceId: string | null,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await this.persistRunOwnership(
          organizationId,
          reportId,
          billingUsageSourceId,
        );
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

function getPaymentRequiredCode(response: unknown): string {
  if (typeof response === 'string') {
    return normalizePaymentRequiredCode(response);
  }
  if (typeof response !== 'object' || response === null) {
    return 'pentest_subscription_required';
  }
  const code = (response as Record<string, unknown>).code;
  if (typeof code === 'string') return normalizePaymentRequiredCode(code);

  const message = (response as Record<string, unknown>).message;
  return typeof message === 'string'
    ? normalizePaymentRequiredCode(message)
    : 'pentest_subscription_required';
}

function normalizePaymentRequiredCode(value: string): string {
  if (
    value === 'pentest_subscription_exhausted' ||
    value.toLowerCase().includes('exhaust') ||
    value.toLowerCase().includes('remaining')
  ) {
    return 'pentest_subscription_exhausted';
  }
  if (value === 'pentest_subscription_required') {
    return 'pentest_subscription_required';
  }
  return 'pentest_subscription_required';
}
