import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ParseQuestionnaireDto } from './dto/parse-questionnaire.dto';
import { ExportQuestionnaireDto } from './dto/export-questionnaire.dto';
import { AnswerSingleQuestionDto } from './dto/answer-single-question.dto';
import { AutoAnswerDto } from './dto/auto-answer.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { DeleteAnswerDto } from './dto/delete-answer.dto';
import { UploadAndParseDto } from './dto/upload-and-parse.dto';
import { ExportByIdDto } from './dto/export-by-id.dto';
import {
  QuestionnaireService,
  type ParsedQuestionnaireResult,
} from './questionnaire.service';
import {
  syncOrganizationEmbeddings,
  findSimilarContentBatch,
} from '@/vector-store/lib';
import { generateAnswerFromContent } from '@/trigger/questionnaire/answer-question-helpers';
import { TrustAccessService } from '../trust-portal/trust-access.service';
import {
  createSafeSSESender,
  setupSSEHeaders,
  sanitizeErrorMessage,
} from '../utils/sse-utils';

@ApiTags('Questionnaire')
@Controller({
  path: 'questionnaire',
  version: '1',
})
export class QuestionnaireController {
  private readonly logger = new Logger(QuestionnaireController.name);

  constructor(
    private readonly questionnaireService: QuestionnaireService,
    private readonly trustAccessService: TrustAccessService,
  ) {}

  @Post('parse')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Parsed questionnaire content',
    type: Object,
  })
  async parseQuestionnaire(
    @Body() dto: ParseQuestionnaireDto,
  ): Promise<ParsedQuestionnaireResult> {
    return this.questionnaireService.parseQuestionnaire(dto);
  }

  @Post('answer-single')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Generated single answer result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            questionIndex: { type: 'number' },
            question: { type: 'string' },
            answer: { type: 'string', nullable: true },
            sources: { type: 'array', items: { type: 'object' } },
            error: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  async answerSingleQuestion(@Body() dto: AnswerSingleQuestionDto) {
    const result = await this.questionnaireService.answerSingleQuestion(dto);
    return {
      success: result.success,
      data: {
        questionIndex: result.questionIndex,
        question: result.question,
        answer: result.answer,
        sources: result.sources,
        error: result.error,
      },
    };
  }

  @Post('save-answer')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Save manual or generated answer',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async saveAnswer(@Body() dto: SaveAnswerDto) {
    return this.questionnaireService.saveAnswer(dto);
  }

  @Post('delete-answer')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Delete questionnaire answer',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string', nullable: true },
      },
    },
  })
  async deleteAnswer(@Body() dto: DeleteAnswerDto) {
    return this.questionnaireService.deleteAnswer(dto);
  }

  @Post('export')
  @ApiConsumes('application/json')
  @ApiProduces(
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @ApiOkResponse({
    description: 'Export questionnaire by ID to specified format',
  })
  async exportById(
    @Body() dto: ExportByIdDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.questionnaireService.exportById(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );

    res.send(result.fileBuffer);
  }

  @Post('upload-and-parse')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description:
      'Upload file, parse questions (no answers), save to DB, return questionnaireId',
    schema: {
      type: 'object',
      properties: {
        questionnaireId: { type: 'string' },
        totalQuestions: { type: 'number' },
      },
    },
  })
  async uploadAndParse(@Body() dto: UploadAndParseDto) {
    return this.questionnaireService.uploadAndParse(dto);
  }

  @Post('upload-and-parse/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Questionnaire file (PDF, image, XLSX, CSV, TXT)',
        },
        organizationId: {
          type: 'string',
          description: 'Organization ID',
        },
        source: {
          type: 'string',
          enum: ['internal', 'external'],
          default: 'internal',
          description: 'Source of the upload',
        },
      },
      required: ['file', 'organizationId'],
    },
  })
  @ApiOkResponse({
    description:
      'Upload file, parse questions (no answers), save to DB, return questionnaireId',
    schema: {
      type: 'object',
      properties: {
        questionnaireId: { type: 'string' },
        totalQuestions: { type: 'number' },
      },
    },
  })
  async uploadAndParseUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      organizationId: string;
      source?: 'internal' | 'external';
    },
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!body.organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const dto: UploadAndParseDto = {
      organizationId: body.organizationId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileData: file.buffer.toString('base64'),
      source: body.source || 'internal',
    };

    return this.questionnaireService.uploadAndParse(dto);
  }

  @Post('parse/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Questionnaire file (PDF, image, XLSX, CSV, TXT)',
        },
        organizationId: {
          type: 'string',
          description: 'Organization to use for generating answers',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'csv', 'xlsx'],
          default: 'xlsx',
          description: 'Output format (defaults to XLSX)',
        },
        source: {
          type: 'string',
          enum: ['internal', 'external'],
          default: 'internal',
          description:
            'Indicates if the request originated from our UI (internal) or trust portal (external).',
        },
      },
      required: ['file', 'organizationId'],
    },
  })
  @ApiProduces(
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async parseQuestionnaireUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      organizationId: string;
      format?: 'pdf' | 'csv' | 'xlsx';
      source?: 'internal' | 'external';
    },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!body.organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const dto: ExportQuestionnaireDto = {
      fileData: file.buffer.toString('base64'),
      fileType: file.mimetype,
      organizationId: body.organizationId,
      fileName: file.originalname,
      vendorName: undefined,
      format: body.format || 'xlsx',
      source: body.source || 'internal',
    };

    const result = await this.questionnaireService.autoAnswerAndExport(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader(
      'X-Question-Count',
      String(result.questionsAndAnswers.length),
    );

    res.send(result.fileBuffer);
  }

  @Post('parse/upload/token')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Trust access token for authentication',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Questionnaire file (PDF, image, XLSX, CSV, TXT)',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'csv', 'xlsx'],
          default: 'xlsx',
          description: 'Output format (ignored - always exports all formats as ZIP)',
        },
      },
      required: ['file'],
    },
  })
  @ApiProduces('application/zip')
  async parseQuestionnaireUploadByToken(
    @UploadedFile() file: Express.Multer.File,
    @Query('token') token: string,
    @Body()
    body: {
      format?: 'pdf' | 'csv' | 'xlsx';
    },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!token) {
      throw new BadRequestException('token is required');
    }

    // Validate token and get organizationId
    const organizationId =
      await this.trustAccessService.validateAccessTokenAndGetOrganizationId(
        token,
      );

    const dto: ExportQuestionnaireDto = {
      fileData: file.buffer.toString('base64'),
      fileType: file.mimetype,
      organizationId,
      fileName: file.originalname,
      vendorName: undefined,
      format: body.format || 'xlsx',
      source: 'external', // Always external for token-based access
      exportInAllExtensions: true, // Export in all formats (PDF, CSV, XLSX) as ZIP
    };
    
    const result = await this.questionnaireService.autoAnswerAndExport(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader(
      'X-Question-Count',
      String(result.questionsAndAnswers.length),
    );

    res.send(result.fileBuffer);
  }

  @Post('answers/export')
  @ApiConsumes('application/json')
  @ApiProduces(
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async autoAnswerAndExport(
    @Body() dto: ExportQuestionnaireDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const result = await this.questionnaireService.autoAnswerAndExport(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader(
      'X-Question-Count',
      String(result.questionsAndAnswers.length),
    );

    res.send(result.fileBuffer);
  }

  @Post('answers/export/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Questionnaire file (PDF, image, XLSX, CSV, TXT)',
        },
        organizationId: {
          type: 'string',
          description: 'Organization to use for answer generation',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'csv', 'xlsx'],
          default: 'xlsx',
          description: 'Output format (defaults to XLSX)',
        },
      },
      required: ['file', 'organizationId'],
    },
  })
  @ApiProduces(
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async autoAnswerAndExportUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { organizationId: string; format?: 'pdf' | 'csv' | 'xlsx' },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    if (!body.organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const dto: ExportQuestionnaireDto = {
      fileData: file.buffer.toString('base64'),
      fileType: file.mimetype,
      organizationId: body.organizationId,
      fileName: file.originalname,
      vendorName: undefined,
      format: body.format || 'xlsx',
    };

    const result = await this.questionnaireService.autoAnswerAndExport(dto);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader(
      'X-Question-Count',
      String(result.questionsAndAnswers.length),
    );

    res.send(result.fileBuffer);
  }

  @Post('auto-answer')
  @ApiConsumes('application/json')
  @ApiProduces('text/event-stream')
  async autoAnswer(
    @Body() dto: AutoAnswerDto,
    @Res() res: Response,
  ): Promise<void> {
    setupSSEHeaders(res);
    const send = createSafeSSESender(res);

    try {
      // Step 1: Sync organization embeddings once
      try {
        await syncOrganizationEmbeddings(dto.organizationId);
      } catch (error) {
        this.logger.warn('Failed to sync organization embeddings', {
          organizationId: dto.organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      const questionsToAnswer = dto.questionsAndAnswers
        .map((qa, index) => ({
          question: qa.question,
          answer: qa.answer ?? null,
          index: qa._originalIndex ?? index,
        }))
        .filter(
          (qa) => !qa.answer || (qa.answer && qa.answer.trim().length === 0),
        );

      if (questionsToAnswer.length === 0) {
        send({
          type: 'complete',
          total: 0,
          answered: 0,
          answers: [],
        });
        return;
      }

      send({
        type: 'progress',
        total: questionsToAnswer.length,
        completed: 0,
        remaining: questionsToAnswer.length,
        phase: 'searching',
      });

      // Step 2: Batch search - generates all embeddings in ONE API call (saves ~5-10 seconds)
      const searchStartTime = Date.now();
      const allSimilarContent = await findSimilarContentBatch(
        questionsToAnswer.map((qa) => qa.question),
        dto.organizationId,
      );
      const searchTime = Date.now() - searchStartTime;

      this.logger.log(
        `Batch search completed in ${searchTime}ms for ${questionsToAnswer.length} questions`,
      );

      send({
        type: 'progress',
        total: questionsToAnswer.length,
        completed: 0,
        remaining: questionsToAnswer.length,
        phase: 'generating',
        searchTimeMs: searchTime,
      });

      const results: Array<{
        questionIndex: number;
        question: string;
        answer: string | null;
        sources?: unknown;
        error?: string;
      }> = [];

      // Step 3: Generate answers in parallel using pre-fetched content (still streams!)
      await Promise.all(
        questionsToAnswer.map(async (qa, i) => {
          try {
            const similarContent = allSimilarContent[i] || [];
            const result = await generateAnswerFromContent(
              qa.question,
              similarContent,
            );

            // Save answer to database if questionnaireId is provided
            if (dto.questionnaireId && result.answer) {
              try {
                await this.questionnaireService.saveGeneratedAnswerPublic({
                  questionnaireId: dto.questionnaireId,
                  questionIndex: qa.index,
                  answer: result.answer,
                  sources: result.sources,
                });
              } catch (saveError) {
                this.logger.warn('Failed to save answer to database', {
                  questionnaireId: dto.questionnaireId,
                  questionIndex: qa.index,
                  error:
                    saveError instanceof Error
                      ? saveError.message
                      : 'Unknown error',
                });
              }
            }

            send({
              type: 'answer',
              questionIndex: qa.index,
              question: qa.question,
              answer: result.answer,
              sources: result.sources,
              success: result.answer !== null,
            });

            results.push({
              questionIndex: qa.index,
              question: qa.question,
              answer: result.answer,
              sources: result.sources,
            });
          } catch (error) {
            const errorPayload = {
              questionIndex: qa.index,
              question: qa.question,
              answer: null,
              sources: [],
              error: sanitizeErrorMessage(error),
            };

            send({
              type: 'answer',
              ...errorPayload,
              success: false,
            });

            results.push(errorPayload);
          }
        }),
      );

      send({
        type: 'complete',
        total: questionsToAnswer.length,
        answered: results.filter((r) => r.answer).length,
        answers: results,
        searchTimeMs: searchTime,
      });
    } catch (error) {
      const safeErrorMessage = sanitizeErrorMessage(error);
      this.logger.error('Error in auto-answer stream', {
        organizationId: dto.organizationId,
        error: safeErrorMessage,
      });
      send({
        type: 'error',
        error: safeErrorMessage,
      });
    } finally {
      res.end();
    }
  }
}
