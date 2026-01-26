import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';
import AdmZip from 'adm-zip';
import { format } from 'date-fns';
import { configure as configureStringify } from 'safe-stable-stringify';
import type {
  TaskEvidenceSummary,
  EvidenceExportResult,
} from './evidence-export.types';
import { buildTaskEvidenceSummary } from './evidence-normalizer';
import {
  generateAutomationPDF,
  generateTaskSummaryPDF,
  sanitizeFilename,
} from './evidence-pdf-generator';
import { redactSensitiveData } from './evidence-redaction';

// Configure safe stringify to handle BigInt, circular refs, etc.
const safeStringify = configureStringify({
  bigint: true,
  circularValue: '[Circular]',
  deterministic: false,
});

@Injectable()
export class EvidenceExportService {
  private readonly logger = new Logger(EvidenceExportService.name);

  /**
   * Get task evidence summary with all automation runs
   */
  async getTaskEvidenceSummary(
    organizationId: string,
    taskId: string,
  ): Promise<TaskEvidenceSummary> {
    this.logger.log('Building task evidence summary', {
      organizationId,
      taskId,
    });
    // Get task with organization
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get app automation runs (integration check runs)
    const appAutomationRuns = await db.integrationCheckRun.findMany({
      where: { taskId },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get custom automation runs (evidence automation runs)
    // Only include published runs (version !== null), exclude draft runs
    const customAutomationRuns = await db.evidenceAutomationRun.findMany({
      where: {
        evidenceAutomation: {
          taskId,
        },
        version: { not: null },
      },
      include: {
        evidenceAutomation: {
          select: {
            id: true,
            name: true,
          },
        },
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

  /**
   * Export a single automation's evidence as PDF
   */
  async exportAutomationPDF(
    organizationId: string,
    taskId: string,
    automationId: string,
  ): Promise<EvidenceExportResult> {
    const summary = await this.getTaskEvidenceSummary(organizationId, taskId);

    const automation = summary.automations.find((a) => a.id === automationId);

    if (!automation) {
      throw new NotFoundException('Automation not found');
    }

    const pdfBuffer = generateAutomationPDF(automation, {
      organizationName: summary.organizationName,
      taskTitle: summary.taskTitle,
    });

    this.logger.log('Automation evidence PDF generated', {
      organizationId,
      taskId,
      automationId,
      runs: automation.runs.length,
      pdfBytes: pdfBuffer.length,
    });

    const filename = `${sanitizeFilename(summary.organizationName)}_${sanitizeFilename(automation.name)}_evidence_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

    return {
      fileBuffer: pdfBuffer,
      mimeType: 'application/pdf',
      filename,
    };
  }

  /**
   * Export all evidence for a task as a ZIP file
   */
  async exportTaskEvidenceZip(
    organizationId: string,
    taskId: string,
    options: { includeRawJson?: boolean } = {},
  ): Promise<EvidenceExportResult> {
    const summary = await this.getTaskEvidenceSummary(organizationId, taskId);

    const zip = new AdmZip();
    const folderName = `${sanitizeFilename(summary.organizationName)}_${sanitizeFilename(summary.taskTitle)}_evidence`;

    // Add summary PDF
    const summaryPdf = generateTaskSummaryPDF(summary);
    zip.addFile(`${folderName}/00-summary.pdf`, summaryPdf);

    // Add individual automation PDFs
    for (const automation of summary.automations) {
      const typePrefix =
        automation.type === 'app_automation' ? 'app' : 'custom';
      // Include short ID suffix to prevent path collisions when names sanitize identically
      const idSuffix = automation.id.slice(-8);
      const automationFolder = `${folderName}/${typePrefix}-${sanitizeFilename(automation.name)}-${idSuffix}`;

      // Generate PDF for this automation
      const pdfBuffer = generateAutomationPDF(automation, {
        organizationName: summary.organizationName,
        taskTitle: summary.taskTitle,
      });

      zip.addFile(`${automationFolder}/evidence.pdf`, pdfBuffer);

      // Optionally include raw JSON
      if (options.includeRawJson) {
        const jsonData = safeStringify(
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
        );

        zip.addFile(
          `${automationFolder}/evidence.json`,
          Buffer.from(jsonData ?? '{}', 'utf-8'),
        );
      }
    }

    const filename = `${folderName}_${format(new Date(), 'yyyy-MM-dd')}.zip`;

    const zipBuffer = zip.toBuffer();

    this.logger.log('Task evidence ZIP generated', {
      organizationId,
      taskId,
      automations: summary.automations.length,
      includeRawJson: !!options.includeRawJson,
      zipBytes: zipBuffer.length,
    });

    return {
      fileBuffer: zipBuffer,
      mimeType: 'application/zip',
      filename,
    };
  }

  /**
   * Export all evidence for an organization (auditor bulk export)
   */
  async exportOrganizationEvidenceZip(
    organizationId: string,
    options: { includeRawJson?: boolean } = {},
  ): Promise<EvidenceExportResult> {
    // Get organization
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all tasks with automation runs (only count published runs for custom automations)
    const tasksWithRuns = await db.task.findMany({
      where: {
        organizationId,
        OR: [
          {
            integrationCheckRuns: {
              some: {},
            },
          },
          {
            evidenceAutomations: {
              some: {
                runs: {
                  some: { version: { not: null } },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    });

    if (tasksWithRuns.length === 0) {
      throw new NotFoundException('No tasks with evidence found');
    }

    const zip = new AdmZip();
    const orgFolder = sanitizeFilename(organization.name);
    const exportDate = format(new Date(), 'yyyy-MM-dd');

    // Add a manifest file
    const manifest = {
      organization: organization.name,
      organizationId,
      exportedAt: new Date().toISOString(),
      tasksCount: tasksWithRuns.length,
      tasks: tasksWithRuns.map((t) => ({ id: t.id, title: t.title })),
    };
    zip.addFile(
      `${orgFolder}/manifest.json`,
      Buffer.from(safeStringify(manifest, null, 2) ?? '{}', 'utf-8'),
    );

    // Export each task
    for (const task of tasksWithRuns) {
      try {
        const summary = await this.getTaskEvidenceSummary(
          organizationId,
          task.id,
        );

        if (summary.automations.length === 0) {
          continue;
        }

        // Include short task ID suffix to prevent path collisions
        const taskIdSuffix = task.id.slice(-8);
        const taskFolder = `${orgFolder}/${sanitizeFilename(task.title)}-${taskIdSuffix}`;

        // Add task summary PDF
        const summaryPdf = generateTaskSummaryPDF(summary);
        zip.addFile(`${taskFolder}/00-summary.pdf`, summaryPdf);

        // Add automation PDFs
        for (const automation of summary.automations) {
          const typePrefix =
            automation.type === 'app_automation' ? 'app' : 'custom';
          const automationName = sanitizeFilename(automation.name);
          // Include short automation ID suffix to prevent path collisions
          const automationIdSuffix = automation.id.slice(-8);

          const pdfBuffer = generateAutomationPDF(automation, {
            organizationName: summary.organizationName,
            taskTitle: summary.taskTitle,
          });

          zip.addFile(
            `${taskFolder}/${typePrefix}-${automationName}-${automationIdSuffix}.pdf`,
            pdfBuffer,
          );

          // Optional JSON
          if (options.includeRawJson) {
            const jsonData = safeStringify(
              redactSensitiveData({
                automation: {
                  id: automation.id,
                  name: automation.name,
                  type: automation.type,
                },
                runs: automation.runs,
                exportedAt: summary.exportedAt,
              }),
              null,
              2,
            );
            zip.addFile(
              `${taskFolder}/${typePrefix}-${automationName}-${automationIdSuffix}.json`,
              Buffer.from(jsonData ?? '{}', 'utf-8'),
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to export task ${task.id}: ${error}`);
      }
    }

    const filename = `${orgFolder}_all-evidence_${exportDate}.zip`;

    const zipBuffer = zip.toBuffer();

    this.logger.log('Organization evidence ZIP generated', {
      organizationId,
      tasks: tasksWithRuns.length,
      includeRawJson: !!options.includeRawJson,
      zipBytes: zipBuffer.length,
    });

    return {
      fileBuffer: zipBuffer,
      mimeType: 'application/zip',
      filename,
    };
  }
}
