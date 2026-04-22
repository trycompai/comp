import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Archiver } from 'archiver';
import { AuditRead } from '../../audit/skip-audit-log.decorator';
import { OrganizationId } from '../../auth/auth-context.decorator';
import { HybridAuthGuard } from '../../auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { EvidenceExportService } from './evidence-export.service';
import { TasksService } from '../tasks.service';

@ApiTags('Evidence Export')
@Controller({ path: 'tasks', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class EvidenceExportController {
  private readonly logger = new Logger(EvidenceExportController.name);

  constructor(
    private readonly evidenceExportService: EvidenceExportService,
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Get evidence summary for a task
   */
  @Get(':taskId/evidence')
  @RequirePermission('evidence', 'read')
  @ApiOperation({
    summary: 'Get task evidence summary',
    description:
      'Retrieve a summary of all automation evidence for a specific task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    example: 'tsk_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Evidence summary retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async getTaskEvidenceSummary(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
  ) {
    this.logger.log('Get task evidence summary', { organizationId, taskId });
    await this.tasksService.verifyTaskAccess(organizationId, taskId);
    return this.evidenceExportService.getTaskEvidenceSummary(
      organizationId,
      taskId,
    );
  }

  /**
   * Export a single automation's evidence as PDF
   */
  @Get(':taskId/evidence/automation/:automationId/pdf')
  @RequirePermission('evidence', 'read')
  @AuditRead()
  @ApiOperation({
    summary: 'Export automation evidence as PDF',
    description:
      'Generate and download a PDF containing all evidence for a specific automation',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
  })
  @ApiParam({
    name: 'automationId',
    description: 'Unique automation identifier (checkId for app automations)',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file generated successfully',
    content: {
      'application/pdf': {},
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Task or automation not found',
  })
  async exportAutomationPDF(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Param('automationId') automationId: string,
    @Res() res: Response,
  ) {
    this.logger.log('Export automation evidence PDF', {
      organizationId,
      taskId,
      automationId,
    });
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    const result = await this.evidenceExportService.exportAutomationPDF(
      organizationId,
      taskId,
      automationId,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.fileBuffer);
  }

  /**
   * Export all evidence for a task as ZIP
   */
  @Get(':taskId/evidence/export')
  @RequirePermission('evidence', 'read')
  @AuditRead()
  @ApiOperation({
    summary: 'Export task evidence as ZIP',
    description:
      'Generate and download a ZIP file containing all automation evidence for a task',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
  })
  @ApiQuery({
    name: 'includeJson',
    description: 'Include raw JSON files alongside PDFs',
    type: 'boolean',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP file generated successfully',
    content: {
      'application/zip': {},
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Task not found',
  })
  async exportTaskEvidenceZip(
    @OrganizationId() organizationId: string,
    @Param('taskId') taskId: string,
    @Query('includeJson') includeJson: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log('Export task evidence ZIP', {
      organizationId,
      taskId,
      includeJson: includeJson === 'true',
    });
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    const { archive, filename } =
      await this.evidenceExportService.streamTaskEvidenceZip(
        organizationId,
        taskId,
        { includeRawJson: includeJson === 'true' },
      );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    pipeArchiveToResponse({
      archive,
      req,
      res,
      logger: this.logger,
      tag: `task ${taskId}`,
    });
  }
}

/**
 * Auditor-only controller for bulk evidence export
 */
@ApiTags('Evidence Export (Auditor)')
@Controller({ path: 'evidence-export', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class AuditorEvidenceExportController {
  private readonly logger = new Logger(AuditorEvidenceExportController.name);

  constructor(private readonly evidenceExportService: EvidenceExportService) {}

  /**
   * Export all evidence for the organization (auditor only)
   */
  @Get('all')
  @RequirePermission('evidence', 'read')
  @AuditRead()
  @ApiOperation({
    summary: 'Export all organization evidence as ZIP (Auditor only)',
    description:
      'Generate and download a ZIP file containing all automation evidence across all tasks. Only accessible by auditors.',
  })
  @ApiQuery({
    name: 'includeJson',
    description: 'Include raw JSON files alongside PDFs',
    type: 'boolean',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP file generated successfully',
    content: {
      'application/zip': {},
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - Auditor role required',
  })
  async exportAllEvidence(
    @OrganizationId() organizationId: string,
    @Query('includeJson') includeJson: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.log('Auditor exporting all evidence', {
      organizationId,
      includeJson: includeJson === 'true',
    });

    const { archive, filename } =
      await this.evidenceExportService.streamOrganizationEvidenceZip(
        organizationId,
        { includeRawJson: includeJson === 'true' },
      );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );

    pipeArchiveToResponse({
      archive,
      req,
      res,
      logger: this.logger,
      tag: `org ${organizationId}`,
    });
  }
}

/**
 * Wire an archive to the HTTP response with two concerns:
 *  1. Archive errors → log and end the response (500 if headers not yet sent).
 *  2. Client disconnect → abort the archive so S3 fetches stop and the
 *     background populate task doesn't keep running for a closed socket.
 *
 * We listen on `res.close` only and distinguish normal-completion from
 * disconnect via `res.writableFinished` (true only after the full response
 * has been flushed). `req.close` is not used because it fires on normal
 * request completion in modern Node, which can race with our response flush
 * and cause false aborts of successful exports.
 */
function pipeArchiveToResponse(params: {
  archive: Archiver;
  req: Request;
  res: Response;
  logger: Logger;
  tag: string;
}): void {
  const { archive, res, logger, tag } = params;
  let aborted = false;

  res.once('close', () => {
    if (aborted) return;
    // writableFinished becomes true only after the response is fully flushed
    // and the 'finish' event fires; on a client disconnect this stays false.
    if (res.writableFinished) return;
    aborted = true;
    logger.warn(`Client disconnected during export (${tag}); aborting archive`);
    archive.abort();
  });

  archive.on('error', (err) => {
    logger.error(`Archive stream error (${tag}): ${err.message}`);
    if (!res.headersSent) {
      res.status(500).end();
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  archive.pipe(res);
}
