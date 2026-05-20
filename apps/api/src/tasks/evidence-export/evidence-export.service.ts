import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import archiver, { type Archiver } from 'archiver';
import { format } from 'date-fns';
import { configure as configureStringify } from 'safe-stable-stringify';
import type {
  TaskEvidenceSummary,
  EvidenceExportResult,
  EvidenceZipStream,
  NormalizedAutomation,
} from './evidence-export.types';
import { buildTaskEvidenceSummary } from './evidence-normalizer';
import {
  generateAutomationPDF,
  generateTaskSummaryPDF,
  sanitizeFilename,
} from './evidence-pdf-generator';
import { redactSensitiveData } from './evidence-redaction';
import {
  appendAttachmentToArchive,
  createFilenameTracker,
  getTaskAttachments,
  type TaskAttachment,
} from './evidence-attachment-streamer';
import {
  getAutomationHeaders,
  loadFullAutomation,
  findTasksWithEvidence,
} from './evidence-data-loader';

const safeStringify = configureStringify({
  bigint: true,
  circularValue: '[Circular]',
  deterministic: false,
});

@Injectable()
export class EvidenceExportService {
  private readonly logger = new Logger(EvidenceExportService.name);

  // Loads all run data into memory — only for the JSON summary endpoint, not ZIP exports.
  async getTaskEvidenceSummary(
    organizationId: string,
    taskId: string,
  ): Promise<TaskEvidenceSummary> {
    this.logger.log('Building task evidence summary', {
      organizationId,
      taskId,
    });
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
      include: { organization: { select: { name: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const appAutomationRuns = await db.integrationCheckRun.findMany({
      where: { taskId },
      include: {
        results: true,
        connection: { include: { provider: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const customAutomationRuns = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomation: { taskId },
        version: { not: null },
      },
      include: {
        evidenceAutomation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = buildTaskEvidenceSummary({
      taskId: task.id,
      taskTitle: task.title,
      organizationId,
      organizationName: task.organization.name,
      appAutomationRuns: appAutomationRuns.map((run) => ({
        id: run.id,
        checkId: run.checkId,
        checkName: run.checkName,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        durationMs: run.durationMs,
        totalChecked: run.totalChecked,
        passedCount: run.passedCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage,
        logs: run.logs,
        createdAt: run.createdAt,
        connection: {
          provider: run.connection.provider
            ? {
                slug: run.connection.provider.slug,
                name: run.connection.provider.name,
              }
            : undefined,
        },
        results: run.results.map((r) => ({
          id: r.id,
          passed: r.passed,
          resourceType: r.resourceType,
          resourceId: r.resourceId,
          title: r.title,
          description: r.description,
          severity: r.severity,
          remediation: r.remediation,
          evidence: r.evidence,
          collectedAt: r.collectedAt,
        })),
      })),
      customAutomationRuns: customAutomationRuns.map((run) => ({
        id: run.id,
        status: run.status,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        runDuration: run.runDuration,
        success: run.success,
        error: run.error,
        logs: run.logs,
        output: run.output,
        evaluationStatus: run.evaluationStatus,
        evaluationReason: run.evaluationReason,
        createdAt: run.createdAt,
        evidenceAutomation: {
          id: run.evidenceAutomation.id,
          name: run.evidenceAutomation.name,
        },
      })),
    });

    this.logger.log('Task evidence summary built', {
      organizationId,
      taskId,
      appRuns: appAutomationRuns.length,
      customRuns: customAutomationRuns.length,
      automations: summary.automations.length,
    });

    return summary;
  }

  async exportAutomationPDF(
    organizationId: string,
    taskId: string,
    automationId: string,
  ): Promise<EvidenceExportResult> {
    const headers = await getAutomationHeaders({ organizationId, taskId });

    const automationHeader = headers.automations.find(
      (a) => a.id === automationId,
    );
    if (!automationHeader) {
      throw new NotFoundException('Automation not found');
    }

    const automation = await loadFullAutomation({
      taskId,
      header: automationHeader,
    });

    const pdfBuffer = generateAutomationPDF(automation, {
      organizationName: headers.organizationName,
      taskTitle: headers.taskTitle,
    });

    this.logger.log('Automation evidence PDF generated', {
      organizationId,
      taskId,
      automationId,
      runs: automation.runs.length,
      pdfBytes: pdfBuffer.length,
    });

    const filename = `${sanitizeFilename(headers.organizationName)}_${sanitizeFilename(automation.name)}_evidence_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    return { fileBuffer: pdfBuffer, mimeType: 'application/pdf', filename };
  }

  async streamTaskEvidenceZip(
    organizationId: string,
    taskId: string,
    options: { includeRawJson?: boolean } = {},
  ): Promise<EvidenceZipStream> {
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
      include: { organization: { select: { name: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const folderName = `${sanitizeFilename(task.organization.name)}_${sanitizeFilename(task.title)}_evidence`;
    const filename = `${folderName}_${format(new Date(), 'yyyy-MM-dd')}.zip`;

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (err) => {
      this.logger.warn(`Archive warning (task ${taskId}): ${err.message}`);
    });
    archive.on('error', (err) => {
      this.logger.error(`Archive error (task ${taskId}): ${err.message}`);
    });

    void this.populateTaskArchive({
      archive,
      organizationId,
      taskId,
      folderName,
      options,
    }).catch((err) => {
      this.logger.error(
        `Failed to populate task ZIP for ${taskId}: ${
          err instanceof Error ? err.stack : String(err)
        }`,
      );
      archive.abort();
    });

    return { archive, filename };
  }

  private async populateTaskArchive(params: {
    archive: Archiver;
    organizationId: string;
    taskId: string;
    folderName: string;
    options: { includeRawJson?: boolean };
  }): Promise<void> {
    const { archive, organizationId, taskId, folderName, options } = params;

    const [headers, attachments] = await Promise.all([
      getAutomationHeaders({ organizationId, taskId }),
      getTaskAttachments(organizationId, taskId),
    ]);

    await this.appendTaskContents({
      archive,
      headers,
      attachments,
      folderName,
      options,
      perAutomationSubfolders: true,
    });

    await archive.finalize();

    this.logger.log('Task evidence ZIP streamed', {
      organizationId,
      taskId,
      automations: headers.automations.length,
      attachments: attachments.length,
      includeRawJson: !!options.includeRawJson,
    });
  }

  // Loads each automation's runs individually so peak memory ≈ one automation, not all combined.
  private async appendTaskContents(params: {
    archive: Archiver;
    headers: TaskEvidenceSummary;
    attachments: TaskAttachment[];
    folderName: string;
    options: { includeRawJson?: boolean };
    perAutomationSubfolders: boolean;
  }): Promise<void> {
    const {
      archive,
      headers,
      attachments,
      folderName,
      options,
      perAutomationSubfolders,
    } = params;

    const summaryPdf = generateTaskSummaryPDF(headers, {
      attachmentsCount: attachments.length,
    });
    archive.append(summaryPdf, { name: `${folderName}/00-summary.pdf` });

    if (attachments.length > 0) {
      const uniqueName = createFilenameTracker();
      for (const attachment of attachments) {
        await appendAttachmentToArchive({
          archive,
          attachment,
          folderPath: `${folderName}/01-attachments`,
          uniqueName,
        });
      }
    }

    for (const automationHeader of headers.automations) {
      const automation = await loadFullAutomation({
        taskId: headers.taskId,
        header: automationHeader,
      });

      const typePrefix =
        automation.type === 'app_automation' ? 'app' : 'custom';
      const automationName = sanitizeFilename(automation.name);
      const idSuffix = automation.id.slice(-8);

      const pdfBuffer = generateAutomationPDF(automation, {
        organizationName: headers.organizationName,
        taskTitle: headers.taskTitle,
      });

      if (perAutomationSubfolders) {
        const sub = `${folderName}/${typePrefix}-${automationName}-${idSuffix}`;
        archive.append(pdfBuffer, { name: `${sub}/evidence.pdf` });
        if (options.includeRawJson) {
          archive.append(
            Buffer.from(
              this.buildAutomationJson(headers, automation),
              'utf-8',
            ),
            { name: `${sub}/evidence.json` },
          );
        }
      } else {
        archive.append(pdfBuffer, {
          name: `${folderName}/${typePrefix}-${automationName}-${idSuffix}.pdf`,
        });
        if (options.includeRawJson) {
          archive.append(
            Buffer.from(
              this.buildAutomationJson(headers, automation),
              'utf-8',
            ),
            {
              name: `${folderName}/${typePrefix}-${automationName}-${idSuffix}.json`,
            },
          );
        }
      }
    }
  }

  private buildAutomationJson(
    summary: TaskEvidenceSummary,
    automation: NormalizedAutomation,
  ): string {
    return (
      safeStringify(
        redactSensitiveData({
          automation: {
            id: automation.id,
            name: automation.name,
            type: automation.type,
            integrationName: automation.integrationName,
            totalRuns: automation.totalRuns,
            successfulRuns: automation.successfulRuns,
            failedRuns: automation.failedRuns,
            latestRunAt: automation.latestRunAt,
          },
          runs: automation.runs.map((run) => ({
            id: run.id,
            status: run.status,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            durationMs: run.durationMs,
            totalChecked: run.totalChecked,
            passedCount: run.passedCount,
            failedCount: run.failedCount,
            evaluationStatus: run.evaluationStatus,
            evaluationReason: run.evaluationReason,
            logs: run.logs,
            output: run.output,
            error: run.error,
            results: run.results,
            createdAt: run.createdAt,
          })),
          exportedAt: summary.exportedAt,
        }),
        null,
        2,
      ) ?? '{}'
    );
  }

  async streamOrganizationEvidenceZip(
    organizationId: string,
    options: { includeRawJson?: boolean } = {},
  ): Promise<EvidenceZipStream> {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const taskIds = await findTasksWithEvidence(organizationId);
    if (taskIds.length === 0) {
      throw new NotFoundException(
        'No tasks with evidence or attachments found',
      );
    }

    const orgFolder = sanitizeFilename(organization.name);
    const exportDate = format(new Date(), 'yyyy-MM-dd');
    const filename = `${orgFolder}_all-evidence_${exportDate}.zip`;

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (err) => {
      this.logger.warn(
        `Archive warning (org ${organizationId}): ${err.message}`,
      );
    });
    archive.on('error', (err) => {
      this.logger.error(
        `Archive error (org ${organizationId}): ${err.message}`,
      );
    });

    void this.populateOrganizationArchive({
      archive,
      organizationId,
      organizationName: organization.name,
      orgFolder,
      taskIds,
      options,
    }).catch((err) => {
      this.logger.error(
        `Failed to populate org ZIP for ${organizationId}: ${
          err instanceof Error ? err.stack : String(err)
        }`,
      );
      archive.abort();
    });

    return { archive, filename };
  }

  private async populateOrganizationArchive(params: {
    archive: Archiver;
    organizationId: string;
    organizationName: string;
    orgFolder: string;
    taskIds: string[];
    options: { includeRawJson?: boolean };
  }): Promise<void> {
    const {
      archive,
      organizationId,
      organizationName,
      orgFolder,
      taskIds,
      options,
    } = params;

    const manifestEntries: Array<{
      id: string;
      title: string;
      automations: number;
      attachments: number;
    }> = [];
    let totalAttachments = 0;

    for (const taskId of taskIds) {
      try {
        const [headers, attachments] = await Promise.all([
          getAutomationHeaders({ organizationId, taskId }),
          getTaskAttachments(organizationId, taskId),
        ]);

        if (headers.automations.length === 0 && attachments.length === 0) {
          continue;
        }

        const taskIdSuffix = headers.taskId.slice(-8);
        const taskFolder = `${orgFolder}/${sanitizeFilename(headers.taskTitle)}-${taskIdSuffix}`;

        await this.appendTaskContents({
          archive,
          headers,
          attachments,
          folderName: taskFolder,
          options,
          perAutomationSubfolders: false,
        });

        manifestEntries.push({
          id: headers.taskId,
          title: headers.taskTitle,
          automations: headers.automations.length,
          attachments: attachments.length,
        });
        totalAttachments += attachments.length;
      } catch (error) {
        this.logger.warn(
          `Failed to export task ${taskId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    manifestEntries.sort((a, b) => a.title.localeCompare(b.title));

    const manifest = {
      organization: organizationName,
      organizationId,
      exportedAt: new Date().toISOString(),
      tasksCount: manifestEntries.length,
      totalAttachments,
      tasks: manifestEntries,
    };
    archive.append(
      Buffer.from(safeStringify(manifest, null, 2) ?? '{}', 'utf-8'),
      { name: `${orgFolder}/manifest.json` },
    );

    await archive.finalize();

    this.logger.log('Organization evidence ZIP streamed', {
      organizationId,
      tasks: manifestEntries.length,
      totalAttachments,
      includeRawJson: !!options.includeRawJson,
    });
  }
}
