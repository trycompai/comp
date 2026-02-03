import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
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
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
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
  @RequirePermission('evidence', 'export')
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
  @RequirePermission('evidence', 'export')
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
    @Res() res: Response,
  ) {
    this.logger.log('Export task evidence ZIP', {
      organizationId,
      taskId,
      includeJson: includeJson === 'true',
    });
    await this.tasksService.verifyTaskAccess(organizationId, taskId);

    const result = await this.evidenceExportService.exportTaskEvidenceZip(
      organizationId,
      taskId,
      { includeRawJson: includeJson === 'true' },
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.fileBuffer);
  }
}

/**
 * Auditor-only controller for bulk evidence export
 */
@ApiTags('Evidence Export (Auditor)')
@Controller({ path: 'evidence-export', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class AuditorEvidenceExportController {
  private readonly logger = new Logger(AuditorEvidenceExportController.name);

  constructor(private readonly evidenceExportService: EvidenceExportService) {}

  /**
   * Export all evidence for the organization (auditor only)
   */
  @Get('all')
  @RequirePermission('evidence', 'export')
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
    @Res() res: Response,
  ) {
    this.logger.log(
      'Auditor exporting all evidence',
      {
        organizationId,
        includeJson: includeJson === 'true',
      },
    );

    const result =
      await this.evidenceExportService.exportOrganizationEvidenceZip(
        organizationId,
        { includeRawJson: includeJson === 'true' },
      );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.fileBuffer);
  }
}
