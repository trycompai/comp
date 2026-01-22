import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DeleteDocumentDto } from './dto/delete-document.dto';
import { GetDocumentUrlDto } from './dto/get-document-url.dto';
import { ProcessDocumentsDto } from './dto/process-documents.dto';
import { DeleteManualAnswerDto } from './dto/delete-manual-answer.dto';
import { DeleteAllManualAnswersDto } from './dto/delete-all-manual-answers.dto';

@Controller({ path: 'knowledge-base', version: '1' })
@ApiTags('Knowledge Base')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get('documents')
  @ApiOperation({
    summary: 'List all knowledge base documents for an organization',
  })
  @ApiOkResponse({
    description: 'List of knowledge base documents',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          s3Key: { type: 'string' },
          fileType: { type: 'string' },
          fileSize: { type: 'number' },
          processingStatus: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  async listDocuments(@Query('organizationId') organizationId: string) {
    return this.knowledgeBaseService.listDocuments(organizationId);
  }

  @Post('documents/upload')
  @ApiOperation({ summary: 'Upload a knowledge base document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        s3Key: { type: 'string' },
      },
    },
  })
  async uploadDocument(@Body() dto: UploadDocumentDto) {
    return this.knowledgeBaseService.uploadDocument(dto);
  }

  @Post('documents/:documentId/download')
  @ApiOperation({
    summary: 'Get a signed download URL for a knowledge base document',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Signed download URL generated',
    schema: {
      type: 'object',
      properties: {
        signedUrl: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get a signed view URL for a knowledge base document',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Signed view URL generated',
    schema: {
      type: 'object',
      properties: {
        signedUrl: { type: 'string' },
        fileName: { type: 'string' },
        fileType: { type: 'string' },
        viewableInBrowser: { type: 'boolean' },
      },
    },
  })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a knowledge base document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        vectorDeletionRunId: { type: 'string', nullable: true },
        publicAccessToken: { type: 'string', nullable: true },
      },
    },
  })
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
  @ApiOperation({ summary: 'Trigger processing of knowledge base documents' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document processing triggered',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        runId: { type: 'string' },
        publicAccessToken: { type: 'string', nullable: true },
        message: { type: 'string' },
      },
    },
  })
  async processDocuments(@Body() dto: ProcessDocumentsDto) {
    return this.knowledgeBaseService.processDocuments(dto);
  }

  @Post('runs/:runId/token')
  @ApiOperation({
    summary: 'Create a public access token for a Trigger.dev run',
  })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Public access token created',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        token: { type: 'string', nullable: true },
      },
    },
  })
  async createRunToken(@Param('runId') runId: string) {
    const token = await this.knowledgeBaseService.createRunReadToken(runId);
    return {
      success: !!token,
      token,
    };
  }

  @Post('manual-answers/:manualAnswerId/delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a manual answer' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Manual answer deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string', nullable: true },
      },
    },
  })
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all manual answers for an organization' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'All manual answers deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async deleteAllManualAnswers(@Body() dto: DeleteAllManualAnswersDto) {
    return this.knowledgeBaseService.deleteAllManualAnswers(dto);
  }
}
