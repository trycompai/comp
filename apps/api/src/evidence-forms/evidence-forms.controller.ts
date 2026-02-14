import { AuthContext, OrganizationId } from '@/auth/auth-context.decorator';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '@/auth/types';
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { EvidenceFormsService } from './evidence-forms.service';

@ApiTags('Evidence Forms')
@Controller({ path: 'evidence-forms', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class EvidenceFormsController {
  constructor(private readonly evidenceFormsService: EvidenceFormsService) {}

  @Get()
  @ApiOperation({
    summary: 'List evidence forms',
    description: 'List all available pre-built evidence forms',
  })
  listForms() {
    return this.evidenceFormsService.listForms();
  }

  @Get('statuses')
  @ApiOperation({
    summary: 'Get submission statuses for all forms',
    description:
      'Returns the latest submission date per form type for the active organization',
  })
  async getFormStatuses(@OrganizationId() organizationId: string) {
    return this.evidenceFormsService.getFormStatuses(organizationId);
  }

  @Get('my-submissions')
  @ApiOperation({
    summary: 'Get current user submissions',
    description:
      'Returns all evidence form submissions by the authenticated user for the active organization',
  })
  async getMySubmissions(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('formType') formType?: string,
  ) {
    return this.evidenceFormsService.getMySubmissions({
      organizationId,
      authContext,
      formType,
    });
  }

  @Get('my-submissions/pending-count')
  @ApiOperation({
    summary: 'Get pending submission count for current user',
    description:
      'Returns the count of pending evidence submissions for the authenticated user',
  })
  async getPendingSubmissionCount(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.evidenceFormsService.getPendingSubmissionCount({
      organizationId,
      authContext,
    });
  }

  @Get(':formType')
  @ApiOperation({
    summary: 'Get form definition and submissions',
    description:
      'Fetch a specific form definition with submissions for the active organization',
  })
  async getFormWithSubmissions(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('formType') formType: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.evidenceFormsService.getFormWithSubmissions({
      organizationId,
      authContext,
      formType,
      search,
      limit,
      offset,
    });
  }

  @Get(':formType/submissions/:submissionId')
  @ApiOperation({
    summary: 'Get a single submission',
    description:
      'Fetch one evidence form submission for the active organization',
  })
  async getSubmission(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('formType') formType: string,
    @Param('submissionId') submissionId: string,
  ) {
    return this.evidenceFormsService.getSubmission({
      organizationId,
      authContext,
      formType,
      submissionId,
    });
  }

  @Post(':formType/submissions')
  @ApiOperation({
    summary: 'Submit evidence form entry',
    description:
      'Create a new organization-scoped evidence form submission using Zod-validated payloads',
  })
  async submitForm(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('formType') formType: string,
    @Body() body: unknown,
  ) {
    return this.evidenceFormsService.submitForm({
      organizationId,
      formType,
      payload: body,
      authContext,
    });
  }

  @Patch(':formType/submissions/:submissionId/review')
  @ApiOperation({
    summary: 'Review a submission',
    description:
      'Approve or reject an evidence form submission with an optional reason',
  })
  async reviewSubmission(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('formType') formType: string,
    @Param('submissionId') submissionId: string,
    @Body() body: unknown,
  ) {
    return this.evidenceFormsService.reviewSubmission({
      organizationId,
      formType,
      submissionId,
      payload: body,
      authContext,
    });
  }

  @Post('uploads')
  @ApiOperation({
    summary: 'Upload evidence form file',
    description:
      'Upload a file for evidence form fields and return file metadata for submission payload',
  })
  async uploadFile(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: unknown,
  ) {
    return this.evidenceFormsService.uploadFile({
      organizationId,
      authContext,
      payload: body,
    });
  }

  @Get(':formType/export.csv')
  @ApiOperation({
    summary: 'Export form submissions to CSV',
    description: 'Export all form submissions for an organization as CSV',
  })
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('formType') formType: string,
    @Res() res: Response,
  ) {
    const csv = await this.evidenceFormsService.exportCsv({
      organizationId,
      authContext,
      formType,
    });

    const filename = `${formType}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
