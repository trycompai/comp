import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
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
import { syncOrganizationEmbeddings } from '@/vector-store/lib';

@ApiTags('Questionnaire')
@Controller({
  path: 'questionnaire',
  version: '1',
})
export class QuestionnaireController {
  private readonly logger = new Logger(QuestionnaireController.name);

  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post('parse')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Parsed questionnaire content',
    type: Object,
  })
  async parseQuestionnaire(@Body() dto: ParseQuestionnaireDto): Promise<ParsedQuestionnaireResult> {
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
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    res.send(result.fileBuffer);
  }

  @Post('upload-and-parse')
  @ApiConsumes('application/json')
  @ApiOkResponse({
    description: 'Upload file, parse questions (no answers), save to DB, return questionnaireId',
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
    description: 'Upload file, parse questions (no answers), save to DB, return questionnaireId',
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
          description: 'Indicates if the request originated from our UI (internal) or trust portal (external).',
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
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Question-Count', String(result.questionsAndAnswers.length));

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
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Question-Count', String(result.questionsAndAnswers.length));

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
        organizationId: { type: 'string', description: 'Organization to use for answer generation' },
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
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Question-Count', String(result.questionsAndAnswers.length));

    res.send(result.fileBuffer);
  }

  @Post('auto-answer')
  @ApiConsumes('application/json')
  @ApiProduces('text/event-stream')
  async autoAnswer(
    @Body() dto: AutoAnswerDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    (res as any).flushHeaders?.();

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
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
        .filter((qa) => !qa.answer || (qa.answer && qa.answer.trim().length === 0));

      send({
        type: 'progress',
        total: questionsToAnswer.length,
        completed: 0,
        remaining: questionsToAnswer.length,
      });

      const results: Array<{
        questionIndex: number;
        question: string;
        answer: string | null;
        sources?: unknown;
        error?: string;
      }> = [];

      await Promise.all(
        questionsToAnswer.map(async (qa) => {
          try {
            const result = await this.questionnaireService.answerSingleQuestion(
              {
                question: qa.question,
                organizationId: dto.organizationId,
                questionIndex: qa.index,
                totalQuestions: dto.questionsAndAnswers.length,
                questionnaireId: dto.questionnaireId,
              },
              { skipSync: true }, // Skip sync since we already synced at the beginning
            );

            send({
              type: 'answer',
              questionIndex: result.questionIndex,
              question: result.question,
              answer: result.answer,
              sources: result.sources,
              success: result.success,
            });

            results.push({
              questionIndex: result.questionIndex,
              question: result.question,
              answer: result.answer,
              sources: result.sources,
            });
          } catch (error) {
            const errorPayload = {
              questionIndex: qa.index,
              question: qa.question,
              answer: null,
              sources: [],
              error: error instanceof Error ? error.message : 'Unknown error',
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
      });
    } catch (error) {
      this.logger.error('Error in auto-answer stream', {
        organizationId: dto.organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      send({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      res.end();
    }
  }
}
