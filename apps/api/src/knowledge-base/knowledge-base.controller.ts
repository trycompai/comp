import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
  ApiSecurity,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId } from '../auth/auth-context.decorator';
import { AuditRead } from '../audit/skip-audit-log.decorator';
import { KnowledgeBaseService } from './knowledge-base.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DeleteDocumentDto } from './dto/delete-document.dto';
import { GetDocumentUrlDto } from './dto/get-document-url.dto';
import { ProcessDocumentsDto } from './dto/process-documents.dto';
import { DeleteManualAnswerDto } from './dto/delete-manual-answer.dto';
import { DeleteAllManualAnswersDto } from './dto/delete-all-manual-answers.dto';
import { SaveManualAnswerDto } from './dto/save-manual-answer.dto';

@Controller({ path: 'knowledge-base', version: '1' })
@ApiTags('Knowledge Base')
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('documents')
  @RequirePermission('questionnaire', 'read')
  @ApiOperation({
    summary: 'List all knowledge base documents for an organization',
  })
  @ApiOkResponse({ description: 'List of knowledge base documents' })
  async listDocuments(@OrganizationId() organizationId: string) {
    return this.knowledgeBaseService.listDocuments(organizationId);
  }

  @Get('manual-answers')
  @RequirePermission('questionnaire', 'read')
  @ApiOperation({ summary: 'List all manual answers for an organization' })
  @ApiOkResponse({ description: 'List of manual answers' })
  async listManualAnswers(@OrganizationId() organizationId: string) {
    return this.knowledgeBaseService.listManualAnswers(organizationId);
  }

  @Post('manual-answers')
  @RequirePermission('questionnaire', 'respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save or update a manual answer' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Manual answer saved' })
  async saveManualAnswer(
    @OrganizationId() organizationId: string,
    @Body() dto: SaveManualAnswerDto,
  ) {
    return this.knowledgeBaseService.saveManualAnswer({
      ...dto,
      organizationId,
    });
  }

  @Post('documents/upload')
  @RequirePermission('questionnaire', 'create')
  @ApiOperation({ summary: 'Upload a knowledge base document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document uploaded successfully' })
  async uploadDocument(@Body() dto: UploadDocumentDto) {
    return this.knowledgeBaseService.uploadDocument(dto);
  }

  @Post('documents/:documentId/download')
  @RequirePermission('questionnaire', 'read')
  @AuditRead()
  @ApiOperation({ summary: 'Get a signed download URL for a document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Signed download URL generated' })
  async getDownloadUrl(
    @Param('documentId') documentId: string,
    @Body() dto: Omit<GetDocumentUrlDto, 'documentId'>,
  ) {
    return this.knowledgeBaseService.getDownloadUrl({
      ...dto,
      documentId,
    });
  }

  @Post('documents/:documentId/view')
  @RequirePermission('questionnaire', 'read')
  @AuditRead()
  @ApiOperation({ summary: 'Get a signed view URL for a document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Signed view URL generated' })
  async getViewUrl(
    @Param('documentId') documentId: string,
    @Body() dto: Omit<GetDocumentUrlDto, 'documentId'>,
  ) {
    return this.knowledgeBaseService.getViewUrl({
      ...dto,
      documentId,
    });
  }

  @Post('documents/:documentId/delete')
  @RequirePermission('questionnaire', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a knowledge base document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document deleted successfully' })
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Body() dto: Omit<DeleteDocumentDto, 'documentId'>,
  ) {
    return this.knowledgeBaseService.deleteDocument({
      ...dto,
      documentId,
    });
  }

  @Post('documents/process')
  @RequirePermission('questionnaire', 'create')
  @ApiOperation({ summary: 'Trigger processing of knowledge base documents' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Document processing triggered' })
  async processDocuments(@Body() dto: ProcessDocumentsDto) {
    return this.knowledgeBaseService.processDocuments(dto);
  }

  @Post('runs/:runId/token')
  @RequirePermission('questionnaire', 'read')
  @ApiOperation({ summary: 'Create a public access token for a run' })
  @ApiOkResponse({ description: 'Public access token created' })
  async createRunToken(@Param('runId') runId: string) {
    const token = await this.knowledgeBaseService.createRunReadToken(runId);
    return { success: !!token, token };
  }

  @Post('manual-answers/:manualAnswerId/delete')
  @RequirePermission('questionnaire', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a manual answer' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Manual answer deleted' })
  async deleteManualAnswer(
    @Param('manualAnswerId') manualAnswerId: string,
    @Body() dto: DeleteManualAnswerDto,
  ) {
    return this.knowledgeBaseService.deleteManualAnswer({
      ...dto,
      manualAnswerId,
    });
  }

  @Post('manual-answers/delete-all')
  @RequirePermission('questionnaire', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all manual answers for an organization' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'All manual answers deleted' })
  async deleteAllManualAnswers(@Body() dto: DeleteAllManualAnswersDto) {
    return this.knowledgeBaseService.deleteAllManualAnswers(dto);
  }
}
