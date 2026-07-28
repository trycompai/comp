import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UploadsService } from '../uploads/uploads.service';
import type { AnswerQuestionResult } from '@/trigger/questionnaire/answer-question';
import { answerQuestion } from '@/trigger/questionnaire/answer-question';
import { generateAnswerWithRAGBatch } from '@/trigger/questionnaire/answer-question-helpers';
import { tasks } from '@trigger.dev/sdk';
import type { parseQuestionnaireTask } from '@/trigger/questionnaire/parse-questionnaire';
import type { autoAnswerQuestionnaireTask } from '@/trigger/questionnaire/auto-answer-questionnaire';
import { TriggerAutoAnswerResponseDto } from './dto/trigger-auto-answer-response.dto';
import { ParseQuestionnaireDto } from './dto/parse-questionnaire.dto';
import { ExportQuestionnaireDto } from './dto/export-questionnaire.dto';
import { AnswerSingleQuestionDto } from './dto/answer-single-question.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { DeleteAnswerDto } from './dto/delete-answer.dto';
import { UploadAndParseDto } from './dto/upload-and-parse.dto';
import { ExportByIdDto } from './dto/export-by-id.dto';
import { db, Prisma } from '@db';
import {
  syncManualAnswerToVector,
  syncOrganizationEmbeddings,
} from '@/vector-store/lib';
import AdmZip from 'adm-zip';

// Import shared utilities
import {
  extractContentFromFile,
  type ContentExtractionLogger,
} from './utils/content-extractor';
import { parseQuestionsAndAnswers } from './utils/question-parser';
import {
  generateExportFile,
  type ExportFormat,
} from './utils/export-generator';
import {
  updateAnsweredCount,
  persistQuestionnaireResult,
  uploadQuestionnaireFile,
  saveGeneratedAnswer,
  type StorageLogger,
} from './utils/questionnaire-storage';

export interface QuestionnaireAnswer {
  question: string;
  answer: string | null;
  sources?: AnswerQuestionResult['sources'];
}

export interface ParsedQuestionnaireResult {
  vendorName?: string;
  fileName?: string;
  totalQuestions: number;
  questionsAndAnswers: QuestionnaireAnswer[];
}

export interface QuestionnaireExportResult {
  fileBuffer: Buffer;
  mimeType: string;
  filename: string;
  questionsAndAnswers: QuestionnaireAnswer[];
}

@Injectable()
export class QuestionnaireService {
  private readonly logger = new Logger(QuestionnaireService.name);

  constructor(private readonly uploadsService: UploadsService) {}

  private get contentLogger(): ContentExtractionLogger {
    return {
      info: (msg, meta) => this.logger.log(msg, meta),
      warn: (msg, meta) => this.logger.warn(msg, meta),
      error: (msg, meta) => this.logger.error(msg, meta),
    };
  }

  private get storageLogger(): StorageLogger {
    return {
      log: (msg, meta) => this.logger.log(msg, meta),
      error: (msg, meta) => this.logger.error(msg, meta),
    };
  }

  async parseQuestionnaire(
    dto: ParseQuestionnaireDto,
  ): Promise<ParsedQuestionnaireResult> {
    const extractedContent = await extractContentFromFile(
      dto.fileData,
      dto.fileType,
      this.contentLogger,
    );
    const questionsAndAnswers = await parseQuestionsAndAnswers(
      extractedContent,
      this.contentLogger,
    );

    return {
      vendorName: dto.vendorName,
      fileName: dto.fileName,
      totalQuestions: questionsAndAnswers.length,
      questionsAndAnswers: questionsAndAnswers.map((qa) => ({
        question: qa.question,
        answer: qa.answer,
      })),
    };
  }

  async autoAnswerAndExport(
    dto: ExportQuestionnaireDto,
  ): Promise<QuestionnaireExportResult> {
    let uploadInfo: { s3Key: string; fileSize: number } | null = null;
    if (dto.fileData) {
      uploadInfo = await uploadQuestionnaireFile({
        organizationId: dto.organizationId,
        fileName: dto.fileName || dto.vendorName || 'questionnaire',
        fileType: dto.fileType,
        fileData: dto.fileData,
        source: dto.source || 'internal',
      });
    } else {
      this.logger.warn(
        'No fileData provided for autoAnswerAndExport; original file will not be saved.',
        { organizationId: dto.organizationId },
      );
    }

    this.logger.log('Parsing questionnaire for auto-answer export');
    const extractedContent = await extractContentFromFile(
      dto.fileData,
      dto.fileType,
      this.contentLogger,
    );
    const questionsAndAnswers = await parseQuestionsAndAnswers(
      extractedContent,
      this.contentLogger,
    );
    this.logger.log('Parsed questionnaire for auto-answer export', {
      questionCount: questionsAndAnswers.length,
    });

    this.logger.log('Generating answers for parsed questionnaire', {
      questionCount: questionsAndAnswers.length,
    });
    const answered = await this.generateAnswersForQuestions(
      questionsAndAnswers.map((qa) => ({
        question: qa.question,
        answer: null,
      })),
      dto.organizationId,
    );
    this.logger.log('Generated questionnaire answers', {
      questionCount: answered.length,
    });

    const vendorName = dto.vendorName || dto.fileName || 'questionnaire';

    // Check if we need to export in all formats
    if (dto.exportInAllExtensions) {
      // Generate all three formats
      const formats: ExportFormat[] = ['pdf', 'csv', 'xlsx'];
      const zip = new AdmZip();

      for (const format of formats) {
        const exportFile = await generateExportFile(
          answered.map((a) => ({ question: a.question, answer: a.answer })),
          format,
          vendorName,
        );
        zip.addFile(exportFile.filename, exportFile.fileBuffer);
      }

      const zipBuffer = zip.toBuffer();

      await persistQuestionnaireResult(
        {
          organizationId: dto.organizationId,
          fileName: dto.fileName || vendorName,
          fileType: dto.fileType,
          fileSize:
            uploadInfo?.fileSize ??
            (dto.fileData ? Buffer.from(dto.fileData, 'base64').length : 0),
          s3Key: uploadInfo?.s3Key ?? null,
          questionsAndAnswers: answered,
          source: dto.source || 'internal',
        },
        this.storageLogger,
      );

      return {
        fileBuffer: zipBuffer,
        mimeType: 'application/zip',
        filename: `${vendorName.replace(/\.[^/.]+$/, '')}-all-formats.zip`,
        questionsAndAnswers: answered,
      };
    }

    // Single format export (default behavior)
    const exportFile = await generateExportFile(
      answered.map((a) => ({ question: a.question, answer: a.answer })),
      dto.format,
      vendorName,
    );

    await persistQuestionnaireResult(
      {
        organizationId: dto.organizationId,
        fileName: dto.fileName || vendorName,
        fileType: dto.fileType,
        fileSize:
          uploadInfo?.fileSize ??
          (dto.fileData ? Buffer.from(dto.fileData, 'base64').length : 0),
        s3Key: uploadInfo?.s3Key ?? null,
        questionsAndAnswers: answered,
        source: dto.source || 'internal',
      },
      this.storageLogger,
    );

    return {
      ...exportFile,
      questionsAndAnswers: answered,
    };
  }

  async uploadAndParse(
    dto: UploadAndParseDto,
  ): Promise<{ runId: string; publicAccessToken: string }> {
    // Accept either base64 fileData (UI/direct callers) or an s3Key from a
    // presigned upload (AI/MCP clients). When an s3Key is given we fetch the
    // bytes server-side so the binary never travels through the request/LLM.
    const fileData =
      dto.fileData ??
      (dto.s3Key
        ? await this.uploadsService.readUploadAsBase64(
            dto.organizationId,
            dto.s3Key,
          )
        : undefined);

    if (!fileData) {
      throw new BadRequestException(
        'Provide either fileData (base64) or s3Key from /v1/uploads/presign.',
      );
    }

    // Upload file to S3 first
    const uploadInfo = await uploadQuestionnaireFile({
      organizationId: dto.organizationId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileData,
      source: dto.source || 'internal',
    });

    if (!uploadInfo) {
      throw new Error('Failed to upload questionnaire file to S3');
    }

    // Trigger async processing via Trigger.dev
    const handle = await tasks.trigger<typeof parseQuestionnaireTask>(
      'parse-questionnaire',
      {
        inputType: 's3' as const,
        organizationId: dto.organizationId,
        s3Key: uploadInfo.s3Key,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: uploadInfo.fileSize,
      },
    );

    this.logger.log('Triggered async questionnaire parsing', {
      runId: handle.id,
      s3Key: uploadInfo.s3Key,
      fileName: dto.fileName,
    });

    return {
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
    };
  }

  /**
   * Kicks off background answer generation for an already-parsed questionnaire
   * and returns immediately. Non-streaming counterpart to the SSE `autoAnswer`
   * endpoint, so a single JSON-RPC client (MCP/agent) can drive it: trigger
   * here, then poll findById until answeredQuestions === totalQuestions.
   */
  async triggerAutoAnswer(
    questionnaireId: string,
    organizationId: string,
  ): Promise<TriggerAutoAnswerResponseDto> {
    const questionnaire = await db.questionnaire.findFirst({
      where: { id: questionnaireId, organizationId },
      select: { id: true, totalQuestions: true, answeredQuestions: true },
    });

    if (!questionnaire) {
      throw new NotFoundException(
        `Questionnaire ${questionnaireId} not found`,
      );
    }

    if (questionnaire.totalQuestions === 0) {
      throw new BadRequestException(
        'This questionnaire has no parsed questions yet. Upload and parse a file first.',
      );
    }

    const handle = await tasks.trigger<typeof autoAnswerQuestionnaireTask>(
      'auto-answer-questionnaire',
      { questionnaireId, organizationId },
    );

    this.logger.log('Triggered async questionnaire auto-answer', {
      runId: handle.id,
      questionnaireId,
    });

    return {
      questionnaireId,
      runId: handle.id,
      publicAccessToken: handle.publicAccessToken,
      status: 'generating',
      totalQuestions: questionnaire.totalQuestions,
      answeredQuestions: questionnaire.answeredQuestions,
      message: `Generating answers for ${questionnaire.totalQuestions} questions. Poll GET /v1/questionnaire/${questionnaireId} until answeredQuestions reaches totalQuestions.`,
    };
  }

  async answerSingleQuestion(
    dto: AnswerSingleQuestionDto,
    options?: { skipSync?: boolean },
  ): Promise<AnswerQuestionResult> {
    const result = await answerQuestion(
      {
        question: dto.question,
        organizationId: dto.organizationId,
        questionIndex: dto.questionIndex,
        totalQuestions: dto.totalQuestions,
      },
      { useMetadata: false, skipSync: options?.skipSync },
    );

    if (result.success && result.answer && dto.questionnaireId) {
      await saveGeneratedAnswer({
        questionnaireId: dto.questionnaireId,
        organizationId: dto.organizationId,
        questionIndex: dto.questionIndex,
        answer: result.answer,
        sources: result.sources,
      });
    }

    return result;
  }

  async saveAnswer(
    dto: SaveAnswerDto,
  ): Promise<{ success: boolean; error?: string }> {
    if (!dto.questionAnswerId && dto.questionIndex === undefined) {
      return {
        success: false,
        error: 'questionIndex or questionAnswerId is required',
      };
    }

    const questionnaire = await db.questionnaire.findUnique({
      where: {
        id: dto.questionnaireId,
        organizationId: dto.organizationId,
      },
      include: {
        questions: {
          where: dto.questionAnswerId
            ? { id: dto.questionAnswerId }
            : { questionIndex: dto.questionIndex },
        },
      },
    });

    if (!questionnaire) {
      return { success: false, error: 'Questionnaire not found' };
    }

    let existingQuestion: Awaited<
      ReturnType<typeof db.questionnaireQuestionAnswer.findUnique>
    > = questionnaire.questions[0] ?? null;
    let questionIndex = dto.questionIndex;

    if (!existingQuestion && dto.questionAnswerId) {
      existingQuestion = await db.questionnaireQuestionAnswer.findUnique({
        where: {
          id: dto.questionAnswerId,
          questionnaireId: dto.questionnaireId,
        },
      });
    }

    if (!existingQuestion && questionIndex !== undefined) {
      existingQuestion = await db.questionnaireQuestionAnswer.findFirst({
        where: {
          questionnaireId: dto.questionnaireId,
          questionIndex,
        },
      });
    }

    if (!existingQuestion) {
      return { success: false, error: 'Question answer not found' };
    }

    if (questionIndex === undefined) {
      questionIndex = existingQuestion.questionIndex;
    }

    const normalizedAnswer = dto.answer?.trim() || null;

    await db.questionnaireQuestionAnswer.update({
      where: { id: existingQuestion.id },
      data: {
        answer: normalizedAnswer,
        status: dto.status === 'generated' ? 'generated' : 'manual',
        sources: dto.sources
          ? (dto.sources as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        generatedAt: dto.status === 'generated' ? new Date() : null,
        updatedBy: null,
        updatedAt: new Date(),
      },
    });

    // Sync manual answer to vector DB
    if (
      dto.status === 'manual' &&
      normalizedAnswer &&
      existingQuestion.question &&
      existingQuestion.question.trim().length > 0
    ) {
      try {
        const manualAnswer = await db.securityQuestionnaireManualAnswer.upsert({
          where: {
            organizationId_question: {
              organizationId: dto.organizationId,
              question: existingQuestion.question.trim(),
            },
          },
          create: {
            question: existingQuestion.question.trim(),
            answer: normalizedAnswer,
            tags: [],
            organizationId: dto.organizationId,
            sourceQuestionnaireId: dto.questionnaireId,
            createdBy: null,
            updatedBy: null,
          },
          update: {
            answer: normalizedAnswer,
            sourceQuestionnaireId: dto.questionnaireId,
            updatedBy: null,
            updatedAt: new Date(),
          },
        });

        await syncManualAnswerToVector(manualAnswer.id, dto.organizationId);
      } catch (error) {
        this.logger.error('Error saving manual answer to vector DB', {
          organizationId: dto.organizationId,
          questionIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await updateAnsweredCount(dto.questionnaireId);

    return { success: true };
  }

  async exportById(
    dto: ExportByIdDto,
  ): Promise<{ fileBuffer: Buffer; mimeType: string; filename: string }> {
    const questionnaire = await db.questionnaire.findUnique({
      where: {
        id: dto.questionnaireId,
        organizationId: dto.organizationId,
      },
      include: {
        questions: {
          orderBy: { questionIndex: 'asc' },
        },
      },
    });

    if (!questionnaire) {
      throw new Error('Questionnaire not found');
    }

    const questionsAndAnswers = questionnaire.questions.map((q) => ({
      question: q.question,
      answer: q.answer,
    }));

    this.logger.log('Exporting questionnaire', {
      questionnaireId: dto.questionnaireId,
      originalFilename: questionnaire.filename,
      format: dto.format,
    });

    return await generateExportFile(
      questionsAndAnswers,
      dto.format,
      questionnaire.filename,
    );
  }

  async deleteAnswer(
    dto: DeleteAnswerDto,
  ): Promise<{ success: boolean; error?: string }> {
    const questionnaire = await db.questionnaire.findUnique({
      where: {
        id: dto.questionnaireId,
        organizationId: dto.organizationId,
      },
    });

    if (!questionnaire) {
      return { success: false, error: 'Questionnaire not found' };
    }

    const questionAnswer = await db.questionnaireQuestionAnswer.findUnique({
      where: {
        id: dto.questionAnswerId,
        questionnaireId: dto.questionnaireId,
      },
    });

    if (!questionAnswer) {
      return { success: false, error: 'Question answer not found' };
    }

    await db.questionnaireQuestionAnswer.update({
      where: { id: questionAnswer.id },
      data: {
        answer: null,
        status: 'untouched',
        sources: Prisma.JsonNull,
        generatedAt: null,
        updatedBy: null,
        updatedAt: new Date(),
      },
    });

    await updateAnsweredCount(dto.questionnaireId);

    return { success: true };
  }

  /**
   * Public wrapper for saving generated answers (used by controller)
   */
  async saveGeneratedAnswerPublic(params: {
    questionnaireId: string;
    organizationId: string;
    questionIndex: number;
    answer: string;
    sources?: AnswerQuestionResult['sources'];
  }): Promise<void> {
    await saveGeneratedAnswer(params);
  }

  async findAll(organizationId: string) {
    return db.questionnaire.findMany({
      where: {
        organizationId,
        status: { in: ['completed', 'parsing'] },
      },
      select: {
        id: true,
        filename: true,
        fileType: true,
        status: true,
        totalQuestions: true,
        answeredQuestions: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        questions: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            question: true,
            answer: true,
            status: true,
            questionIndex: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, organizationId: string) {
    return db.questionnaire.findUnique({
      where: { id, organizationId },
      include: {
        questions: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            question: true,
            answer: true,
            status: true,
            questionIndex: true,
            sources: true,
          },
        },
      },
    });
  }

  async deleteById(id: string, organizationId: string) {
    const questionnaire = await db.questionnaire.findUnique({
      where: { id, organizationId },
    });

    if (!questionnaire) {
      throw new NotFoundException(`Questionnaire with ID ${id} not found`);
    }

    await db.questionnaire.delete({ where: { id } });

    return { success: true };
  }

  // Private helper methods

  private async generateAnswersForQuestions(
    questionsAndAnswers: QuestionnaireAnswer[],
    organizationId: string,
  ): Promise<QuestionnaireAnswer[]> {
    const questionsNeedingAnswers = questionsAndAnswers
      .map((qa, index) => ({ ...qa, index }))
      .filter((qa) => !qa.answer || qa.answer.trim().length === 0);

    if (questionsNeedingAnswers.length === 0) {
      return questionsAndAnswers;
    }

    this.logger.log(
      `Generating answers for ${questionsNeedingAnswers.length} of ${questionsAndAnswers.length} questions`,
    );

    // Sync organization embeddings before generating answers
    try {
      await syncOrganizationEmbeddings(organizationId);
    } catch (error) {
      this.logger.error('Failed to sync organization embeddings', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Use batch processing for efficiency
    const startTime = Date.now();
    const questionsToAnswer = questionsNeedingAnswers.map((qa) => qa.question);

    const batchResults = await generateAnswerWithRAGBatch(
      questionsToAnswer,
      organizationId,
    );

    // Map batch results
    const results: AnswerQuestionResult[] = questionsNeedingAnswers.map(
      ({ question, index }, i) => ({
        success: batchResults[i]?.answer !== null,
        questionIndex: index,
        question,
        answer: batchResults[i]?.answer ?? null,
        sources: batchResults[i]?.sources ?? [],
      }),
    );

    const answeredCount = results.filter((r) => r.answer !== null).length;
    const totalTime = Date.now() - startTime;

    this.logger.log(
      `Batch answer generation completed: ${answeredCount}/${questionsNeedingAnswers.length} answered in ${totalTime}ms`,
    );

    const answeredMap = new Map<number, AnswerQuestionResult>();
    results.forEach((result) => {
      answeredMap.set(result.questionIndex, result);
    });

    return questionsAndAnswers.map((qa, index) => {
      const generated = answeredMap.get(index);
      if (!generated || !generated.success || !generated.answer) {
        return qa;
      }

      return {
        question: qa.question,
        answer: generated.answer,
        sources: generated.sources,
      };
    });
  }
}
