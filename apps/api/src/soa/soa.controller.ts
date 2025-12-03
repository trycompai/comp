import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiProduces,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { SOAService } from './soa.service';
import { SaveSOAAnswerDto } from './dto/save-soa-answer.dto';
import { AutoFillSOADto } from './dto/auto-fill-soa.dto';
import { CreateSOADocumentDto } from './dto/create-soa-document.dto';
import { EnsureSOASetupDto } from './dto/ensure-soa-setup.dto';
import { ApproveSOADocumentDto } from './dto/approve-soa-document.dto';
import { DeclineSOADocumentDto } from './dto/decline-soa-document.dto';
import { SubmitSOAForApprovalDto } from './dto/submit-soa-for-approval.dto';
import { syncOrganizationEmbeddings } from '@/vector-store/lib';
import { OrganizationId } from '@/auth/auth-context.decorator';
import { AuthContext } from '@/auth/auth-context.decorator';
import type { AuthContext as AuthContextType } from '@/auth/types';
import { UseGuards } from '@nestjs/common';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { ApiSecurity, ApiHeader } from '@nestjs/swagger';
import {
  createSafeSSESender,
  setupSSEHeaders,
  sanitizeErrorMessage,
} from '../utils/sse-utils';

@ApiTags('SOA')
@Controller({
  path: 'soa',
  version: '1',
})
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class SOAController {
  private readonly logger = new Logger(SOAController.name);

  constructor(private readonly soaService: SOAService) {}

  @Post('save-answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a SOA answer' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Answer saved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async saveAnswer(
    @Body() dto: SaveSOAAnswerDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.soaService.saveAnswer(dto, authContext.userId);
  }

  @Post('auto-fill')
  @ApiConsumes('application/json')
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary: 'Auto-fill SOA document',
    description: 'Streams SOA answers via Server-Sent Events (SSE)',
  })
  async autoFill(
    @Body() dto: AutoFillSOADto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Res() res: Response,
  ): Promise<void> {
    if (!authContext.userId) {
      throw new BadRequestException('User not authenticated');
    }

    const userId = authContext.userId;
    setupSSEHeaders(res);
    const send = createSafeSSESender(res);

    try {
      this.logger.log('Starting auto-fill SOA via SSE', {
        organizationId: dto.organizationId,
        documentId: dto.documentId,
      });

      // Sync organization embeddings first to ensure vector database is up-to-date
      // This ensures we have all policies, context, manual answers, and knowledge base documents
      try {
        await syncOrganizationEmbeddings(dto.organizationId);
      } catch (error) {
        this.logger.warn('Failed to sync organization embeddings', {
          organizationId: dto.organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue anyway - might still have some data in vector DB
      }

      // Get document with configuration first
      const fullDocument = await this.soaService.getDocument(
        dto.documentId,
        dto.organizationId,
      );
      if (!fullDocument) {
        send({
          type: 'error',
          error: 'SOA document not found',
        });
        res.end();
        return;
      }

      const configuration = fullDocument.configuration;
      const questions = configuration.questions as Array<{
        id: string;
        text: string;
        columnMapping: {
          closure: string;
          title: string;
          control_objective: string | null;
          isApplicable: boolean | null;
          justification: string | null;
        };
      }>;

      // Send initial progress
      send({
        type: 'progress',
        total: questions.length,
        completed: 0,
        remaining: questions.length,
        phase: 'searching',
      });

      // Check if organization is fully remote
      const isFullyRemote = await this.soaService.checkIfFullyRemote(
        dto.organizationId,
      );

      // Step 1: Batch search all questions (generates all embeddings in 1 API call)
      const searchStartTime = Date.now();
      const similarContentMap = await this.soaService.batchSearchSOAQuestions(
        questions,
        dto.organizationId,
      );
      const searchTime = Date.now() - searchStartTime;

      this.logger.log(
        `Batch search completed in ${searchTime}ms for ${questions.length} SOA questions`,
      );

      send({
        type: 'progress',
        total: questions.length,
        completed: 0,
        remaining: questions.length,
        phase: 'generating',
        searchTimeMs: searchTime,
      });

      // Send 'processing' status for all questions immediately for instant UI feedback
      questions.forEach((question, index) => {
        send({
          type: 'processing',
          questionId: question.id,
          questionIndex: index,
        });
      });

      // Process questions in parallel
      const results: Array<{
        questionId: string;
        isApplicable: boolean | null;
        justification: string | null;
        success: boolean;
        error?: string;
        insufficientData?: boolean;
      }> = [];

      // Step 2: Process all questions in parallel using pre-fetched content
      const promises = questions.map(async (question, index) => {
        try {
          const similarContent = similarContentMap.get(question.id) || [];
          return await this.soaService.processSOAQuestionWithContent(
            question,
            index,
            similarContent,
            isFullyRemote,
            send,
          );
        } catch (error) {
          this.logger.error('Failed to process SOA question', {
            questionId: question.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          send({
            type: 'answer',
            questionId: question.id,
            questionIndex: index,
            isApplicable: null,
            justification: null,
            success: false,
            error: 'Insufficient data',
            insufficientData: true,
          });

          return {
            questionId: question.id,
            isApplicable: null,
            justification: null,
            success: false,
            error: 'Insufficient data',
            insufficientData: true,
          };
        }
      });

      // Wait for all questions to complete
      const settledResults = await Promise.allSettled(promises);

      // Collect all results
      settledResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });

      // Save answers to database
      const successfulResults = results.filter(
        (r) => r.success && r.isApplicable !== null,
      );

      await this.soaService.saveAnswersToDatabase(
        dto.documentId,
        questions,
        successfulResults,
        userId,
      );

      // Update configuration with results
      await this.soaService.updateConfigurationWithResults(
        configuration.id,
        questions,
        successfulResults,
      );

      // Update document
      const answeredCount = successfulResults.filter(
        (r) => r.isApplicable !== null,
      ).length;
      await this.soaService.updateDocumentAfterAutoFill(
        dto.documentId,
        questions.length,
        answeredCount,
      );

      // Send completion
      send({
        type: 'complete',
        total: questions.length,
        answered: successfulResults.length,
        results: successfulResults,
        searchTimeMs: searchTime,
      });

      this.logger.log('Auto-fill SOA completed via SSE', {
        organizationId: dto.organizationId,
        documentId: dto.documentId,
        totalQuestions: questions.length,
        answered: successfulResults.length,
        searchTimeMs: searchTime,
      });

      res.end();
    } catch (error) {
      const safeErrorMessage = sanitizeErrorMessage(error);
      this.logger.error('Error in auto-fill SOA SSE stream', {
        organizationId: dto.organizationId,
        error: safeErrorMessage,
      });

      send({
        type: 'error',
        error: safeErrorMessage,
      });

      res.end();
    }
  }

  @Post('create-document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a new SOA document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document created successfully',
  })
  async createDocument(
    @Body() dto: CreateSOADocumentDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.soaService.createDocument(dto);
  }

  @Post('ensure-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ensure SOA configuration and document exist' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Setup ensured',
  })
  async ensureSetup(
    @Body() dto: EnsureSOASetupDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.soaService.ensureSetup(dto);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a SOA document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document approved successfully',
  })
  async approveDocument(
    @Body() dto: ApproveSOADocumentDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.soaService.approveDocument(dto, authContext.userId);
  }

  @Post('decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline a SOA document' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document declined successfully',
  })
  async declineDocument(
    @Body() dto: DeclineSOADocumentDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    if (!authContext.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.soaService.declineDocument(dto, authContext.userId);
  }

  @Post('submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit SOA document for approval' })
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Document submitted for approval successfully',
  })
  async submitForApproval(
    @Body() dto: SubmitSOAForApprovalDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.soaService.submitForApproval(dto);
  }
}
