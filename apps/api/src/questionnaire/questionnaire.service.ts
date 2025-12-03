import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { generateObject, generateText, jsonSchema } from 'ai';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AnswerQuestionResult } from './vendors/answer-question';
import { answerQuestion } from './vendors/answer-question';
import { generateAnswerWithRAGBatch } from './vendors/answer-question-helpers';
import { ParseQuestionnaireDto } from './dto/parse-questionnaire.dto';
import {
  ExportQuestionnaireDto,
  type QuestionnaireExportFormat,
} from './dto/export-questionnaire.dto';
import { AnswerSingleQuestionDto } from './dto/answer-single-question.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { DeleteAnswerDto } from './dto/delete-answer.dto';
import { UploadAndParseDto } from './dto/upload-and-parse.dto';
import { ExportByIdDto } from './dto/export-by-id.dto';
import { db, Prisma } from '@db';
import {
  s3Client,
  APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET,
  BUCKET_NAME,
} from '../app/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { syncManualAnswerToVector, syncOrganizationEmbeddings } from '@/vector-store/lib';

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

  async parseQuestionnaire(
    dto: ParseQuestionnaireDto,
  ): Promise<ParsedQuestionnaireResult> {
    const content = await this.extractContentFromFile(
      dto.fileData,
      dto.fileType,
    );
    const questionsAndAnswers = await this.parseQuestionsAndAnswers(content);

    return {
      vendorName: dto.vendorName,
      fileName: dto.fileName,
      totalQuestions: questionsAndAnswers.length,
      questionsAndAnswers,
    };
  }

  async autoAnswerAndExport(
    dto: ExportQuestionnaireDto,
  ): Promise<QuestionnaireExportResult> {
    let uploadInfo: { s3Key: string; fileSize: number } | null = null;
    if (dto.fileData) {
      uploadInfo = await this.uploadQuestionnaireFile({
        organizationId: dto.organizationId,
        fileName: dto.fileName || dto.vendorName || 'questionnaire',
        fileType: dto.fileType,
        fileData: dto.fileData,
        source: dto.source || 'internal',
      });
    } else {
      this.logger.warn(
        'No fileData provided for autoAnswerAndExport; original file will not be saved.',
        {
          organizationId: dto.organizationId,
        },
      );
    }

    const parsed = await this.parseQuestionnaire(dto);
    const answered = await this.generateAnswersForQuestions(
      parsed.questionsAndAnswers,
      dto.organizationId,
    );

    const vendorName =
      dto.vendorName || dto.fileName || parsed.vendorName || 'questionnaire';
    const exportFile = this.generateExportFile(
      answered,
      dto.format,
      vendorName,
    );

    await this.persistQuestionnaireResult({
      organizationId: dto.organizationId,
      fileName: dto.fileName || vendorName,
      fileType: dto.fileType,
      fileSize:
        uploadInfo?.fileSize ??
        (dto.fileData ? Buffer.from(dto.fileData, 'base64').length : 0),
      s3Key: uploadInfo?.s3Key ?? null,
      questionsAndAnswers: answered,
      source: dto.source || 'internal',
    });

    return {
      ...exportFile,
      questionsAndAnswers: answered,
    };
  }

  /**
   * Upload file, parse questions (no answer generation), save to DB, return questionnaireId.
   * This is used by the new_questionnaire page for the initial file upload flow.
   */
  async uploadAndParse(
    dto: UploadAndParseDto,
  ): Promise<{ questionnaireId: string; totalQuestions: number }> {
    // 1. Upload file to S3
    const uploadInfo = await this.uploadQuestionnaireFile({
      organizationId: dto.organizationId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileData: dto.fileData,
      source: dto.source || 'internal',
    });

    // 2. Parse questions from file (no answer generation)
    const content = await this.extractContentFromFile(
      dto.fileData,
      dto.fileType,
    );
    const questionsAndAnswers = await this.parseQuestionsAndAnswers(content);

    // 3. Persist to DB
    const questionnaireId = await this.persistQuestionnaireResult({
      organizationId: dto.organizationId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileSize:
        uploadInfo?.fileSize ?? Buffer.from(dto.fileData, 'base64').length,
      s3Key: uploadInfo?.s3Key ?? null,
      questionsAndAnswers: questionsAndAnswers.map((qa) => ({
        question: qa.question,
        answer: null, // No answers generated yet
        sources: undefined,
      })),
      source: dto.source || 'internal',
    });

    if (!questionnaireId) {
      throw new Error('Failed to save questionnaire');
    }

    return {
      questionnaireId,
      totalQuestions: questionsAndAnswers.length,
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
      await this.saveGeneratedAnswer({
        questionnaireId: dto.questionnaireId,
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

    const answeredCount = await db.questionnaireQuestionAnswer.count({
      where: {
        questionnaireId: dto.questionnaireId,
        answer: {
          not: null,
        },
      },
    });

    await db.questionnaire.update({
      where: { id: dto.questionnaireId },
      data: {
        answeredQuestions: answeredCount,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Export a questionnaire by ID to the specified format (xlsx, csv, pdf)
   */
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

    const questionsAndAnswers: QuestionnaireAnswer[] =
      questionnaire.questions.map((q) => ({
        question: q.question,
        answer: q.answer,
      }));

    const originalFilename = questionnaire.filename;
    this.logger.log('Exporting questionnaire', {
      questionnaireId: dto.questionnaireId,
      originalFilename,
      format: dto.format,
    });

    return this.generateExportFile(
      questionsAndAnswers,
      dto.format,
      originalFilename,
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

    const answeredCount = await db.questionnaireQuestionAnswer.count({
      where: {
        questionnaireId: dto.questionnaireId,
        answer: {
          not: null,
        },
      },
    });

    await db.questionnaire.update({
      where: { id: dto.questionnaireId },
      data: {
        answeredQuestions: answeredCount,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

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
    
    // Sync/Check organization embeddings before generating answers
    try {
      await syncOrganizationEmbeddings(organizationId);
    } catch (error) {
      this.logger.error('Failed to sync organization embeddings', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    // Use batch processing for efficiency:
    // - Batch embedding generation (1 API call instead of N)
    // - Parallel LLM calls for answer generation
    const startTime = Date.now();
    const questionsToAnswer = questionsNeedingAnswers.map((qa) => qa.question);
    
    const batchResults = await generateAnswerWithRAGBatch(
      questionsToAnswer,
              organizationId,
    );

    // Map batch results to AnswerQuestionResult format
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

  private generateExportFile(
    questionsAndAnswers: QuestionnaireAnswer[],
    format: QuestionnaireExportFormat,
    vendorName: string,
  ): { fileBuffer: Buffer; mimeType: string; filename: string } {
    // Remove original extension if present and get base name
    const baseName = vendorName.replace(/\.[^/.]+$/, '');
    // Keep the original name but sanitize only dangerous characters for filenames
    const sanitizedBaseName = baseName.replace(/[<>:"/\\|?*]/g, '_');

    switch (format) {
      case 'xlsx': {
        const buffer = this.generateXLSX(questionsAndAnswers);
        return {
          fileBuffer: buffer,
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${sanitizedBaseName}.xlsx`,
        };
      }
      case 'csv': {
        const csv = this.generateCSV(questionsAndAnswers);
        return {
          fileBuffer: Buffer.from(csv, 'utf-8'),
          mimeType: 'text/csv',
          filename: `${sanitizedBaseName}.csv`,
        };
      }
      case 'pdf':
      default: {
        const buffer = this.generatePDF(questionsAndAnswers, baseName);
        return {
          fileBuffer: buffer,
          mimeType: 'application/pdf',
          filename: `${sanitizedBaseName}.pdf`,
        };
      }
    }
  }

  private generateXLSX(questionsAndAnswers: QuestionnaireAnswer[]): Buffer {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ['#', 'Question', 'Answer'],
      ...questionsAndAnswers.map((qa, index) => [
        index + 1,
        qa.question,
        qa.answer || '',
      ]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questionnaire');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  private generateCSV(questionsAndAnswers: QuestionnaireAnswer[]): string {
    const rows = [
      ['#', 'Question', 'Answer'],
      ...questionsAndAnswers.map((qa, index) => [
        String(index + 1),
        qa.question.replace(/"/g, '""'),
        (qa.answer || '').replace(/"/g, '""'),
      ]),
    ];
    return rows
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');
  }

  private generatePDF(
    questionsAndAnswers: QuestionnaireAnswer[],
    vendorName?: string,
  ): Buffer {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;
    const lineHeight = 7;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = vendorName ? `Questionnaire: ${vendorName}` : 'Questionnaire';
    doc.text(title, margin, yPosition);
    yPosition += lineHeight * 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date().toLocaleDateString()}`,
      margin,
      yPosition,
    );
    yPosition += lineHeight * 2;

    doc.setFontSize(11);
    questionsAndAnswers.forEach((qa, index) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFont('helvetica', 'bold');
      const questionText = `Q${index + 1}: ${qa.question}`;
      const questionLines = doc.splitTextToSize(questionText, contentWidth);
      doc.text(questionLines, margin, yPosition);
      yPosition += questionLines.length * lineHeight + 2;

      doc.setFont('helvetica', 'normal');
      const answerText = qa.answer || 'No answer provided';
      const answerLines = doc.splitTextToSize(
        `A${index + 1}: ${answerText}`,
        contentWidth,
      );
      doc.text(answerLines, margin, yPosition);
      yPosition += answerLines.length * lineHeight + 4;
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async extractContentFromFile(
    fileData: string,
    fileType: string,
  ): Promise<string> {
    const fileBuffer = Buffer.from(fileData, 'base64');

    if (
      fileType === 'application/vnd.ms-excel' ||
      fileType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel.sheet.macroEnabled.12'
    ) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheets: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        });
        const sheetText = jsonData
          .map((row) =>
            Array.isArray(row)
              ? row
                  .filter(
                    (cell) =>
                      cell !== null && cell !== undefined && cell !== '',
                  )
                  .join(' | ')
              : String(row),
          )
          .filter((line) => line.trim() !== '')
          .join('\n');

        if (sheetText.trim()) {
          sheets.push(`Sheet: ${sheetName}\n${sheetText}`);
        }
      }

      return sheets.join('\n\n');
    }

    if (fileType === 'text/csv' || fileType === 'text/comma-separated-values') {
      const text = fileBuffer.toString('utf-8');
      return text
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n');
    }

    if (fileType === 'text/plain' || fileType.startsWith('text/')) {
      return fileBuffer.toString('utf-8');
    }

    if (
      fileType === 'application/msword' ||
      fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      throw new Error(
        'Word documents (.docx) are best converted to PDF or image format for parsing. Alternatively, use a URL to view the document.',
      );
    }

    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';

    if (isImage || isPdf) {
      const base64Data = fileData;
      const mimeType = fileType;
      const { text } = await generateText({
        model: openai('gpt-5-mini'),
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all text and identify question-answer pairs. Look for columns/sections labeled "Question", "Q", "Answer", "A". Match questions (ending with "?" or starting with What/How/Why/When/Is/Can/Do) to nearby answers. Preserve order. Return only Question → Answer pairs.`,
              },
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Data}`,
              },
            ],
          },
        ],
      });

      return text;
    }

    throw new Error(
      `Unsupported file type: ${fileType}. Supported formats: PDF, images (PNG, JPG, etc.), Excel (.xlsx, .xls), CSV, text files (.txt).`,
    );
  }

  private async parseQuestionsAndAnswers(
    content: string,
  ): Promise<QuestionnaireAnswer[]> {
    const MAX_CHUNK_SIZE_CHARS = 80_000;
    const MIN_CHUNK_SIZE_CHARS = 5_000;
    const MAX_QUESTIONS_PER_CHUNK = 1;

    const chunkInfos = this.buildQuestionAwareChunks(content, {
      maxChunkChars: MAX_CHUNK_SIZE_CHARS,
      minChunkChars: MIN_CHUNK_SIZE_CHARS,
      maxQuestionsPerChunk: MAX_QUESTIONS_PER_CHUNK,
    });

    if (chunkInfos.length === 0) {
      return [];
    }

    if (chunkInfos.length === 1) {
      return this.parseChunkQuestionsAndAnswers(chunkInfos[0].content, 0, 1);
    }

    const allResults = await Promise.all(
      chunkInfos.map((chunk, index) =>
        this.parseChunkQuestionsAndAnswers(
          chunk.content,
          index,
          chunkInfos.length,
        ),
      ),
    );

    const seenQuestions = new Map<string, QuestionnaireAnswer>();
    for (const qaArray of allResults) {
      for (const qa of qaArray) {
        const normalizedQuestion = qa.question.toLowerCase().trim();
        if (!seenQuestions.has(normalizedQuestion)) {
          seenQuestions.set(normalizedQuestion, qa);
        }
      }
    }

    return Array.from(seenQuestions.values());
  }

  private async parseChunkQuestionsAndAnswers(
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
  ): Promise<QuestionnaireAnswer[]> {
    const { object } = await generateObject({
      model: openai('gpt-5-mini'),
      mode: 'json',
      schema: jsonSchema({
        type: 'object',
        properties: {
          questionsAndAnswers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                },
              },
              required: ['question'],
            },
          },
        },
        required: ['questionsAndAnswers'],
      }),
      system: `You parse vendor questionnaires. Return only genuine question text paired with its answer.
- Ignore table headers, column labels, metadata rows, or placeholder words such as "Question", "Company Name", "Department", "Assessment Date", "Name of Assessor".
- A valid question is a meaningful sentence (usually ends with '?' or starts with interrogatives like What/Why/How/When/Where/Is/Are/Do/Does/Can/Will/Should).
- Do not fabricate answers; if no answer is provided, set answer to null.
- Keep the original question wording but trim whitespace.`,
      prompt:
        totalChunks > 1
          ? `Chunk ${chunkIndex + 1} of ${totalChunks}.
Instructions:
- Extract only question → answer pairs that represent real questions.
- Ignore rows or cells that contain only headers/labels (e.g. "Company Name", "Department", "Assessment Date", "Question", "Answer") or other metadata.
- If an answer is blank, set it to null.

Chunk content:
${chunk}`
          : `Instructions:
- Extract all meaningful question → answer pairs from the following content.
- Ignore rows or cells that contain only headers/labels (e.g. "Company Name", "Department", "Assessment Date", "Question", "Answer", "Name of Assessor").
- Keep only entries that are actual questions (end with '?' or start with interrogative words).
- If an answer is blank, set it to null.

Content:
${chunk}`,
    });

    const parsed = (object as { questionsAndAnswers: QuestionnaireAnswer[] })
      .questionsAndAnswers;
    return parsed.map((qa) => ({
      question: qa.question,
      answer: qa.answer && qa.answer.trim() !== '' ? qa.answer : null,
    }));
  }

  private buildQuestionAwareChunks(
    content: string,
    options: {
      maxChunkChars: number;
      minChunkChars: number;
      maxQuestionsPerChunk: number;
    },
  ): Array<{ content: string; questionCount: number }> {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return [];
    }

    const chunks: Array<{ content: string; questionCount: number }> = [];
    const lines = trimmedContent.split(/\r?\n/);
    let currentChunk: string[] = [];
    let currentQuestionFound = false;

    const pushChunk = () => {
      const chunkText = currentChunk.join('\n').trim();
      if (!chunkText) {
        return;
      }
      chunks.push({
        content: chunkText,
        questionCount: 1,
      });
      currentChunk = [];
      currentQuestionFound = false;
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      const isEmpty = trimmedLine.length === 0;
      const looksLikeQuestion =
        !isEmpty && this.looksLikeQuestionLine(trimmedLine);

      if (
        looksLikeQuestion &&
        currentQuestionFound &&
        currentChunk.length > 0
      ) {
        pushChunk();
      }

      if (!isEmpty || currentChunk.length > 0) {
        currentChunk.push(line);
      }

      if (looksLikeQuestion) {
        currentQuestionFound = true;
      }
    }

    if (currentChunk.length > 0) {
      pushChunk();
    }

    return chunks.length > 0
      ? chunks
      : [
          {
            content: trimmedContent,
            questionCount: this.estimateQuestionCount(trimmedContent),
          },
        ];
  }

  private looksLikeQuestionLine(line: string): boolean {
    const questionSuffix = /[?？]\s*$/;
    const explicitQuestionPrefix = /^(?:\d+\s*[\).\]]\s*)?(?:question|q)\b/i;
    const interrogativePrefix =
      /^(?:what|why|how|when|where|is|are|does|do|can|will|should|list|describe|explain)\b/i;

    return (
      questionSuffix.test(line) ||
      explicitQuestionPrefix.test(line) ||
      interrogativePrefix.test(line)
    );
  }

  private estimateQuestionCount(text: string): number {
    const questionMarks = text.match(/[?？]/g)?.length ?? 0;
    if (questionMarks > 0) {
      return questionMarks;
    }
    const lines = text
      .split(/\r?\n/)
      .filter((line) => this.looksLikeQuestionLine(line.trim()));
    if (lines.length > 0) {
      return lines.length;
    }
    return Math.max(1, Math.floor(text.length / 1200));
  }

  private async persistQuestionnaireResult(params: {
    organizationId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    questionsAndAnswers: QuestionnaireAnswer[];
    source: 'internal' | 'external';
    s3Key: string | null;
  }): Promise<string | null> {
    try {
      const answeredCount = params.questionsAndAnswers.filter(
        (qa) => qa.answer && qa.answer.trim().length > 0,
      ).length;

      const questionnaire = await db.questionnaire.create({
        data: {
          filename: params.fileName,
          s3Key: params.s3Key ?? `api-upload-${params.source}`,
          fileType: params.fileType,
          fileSize: params.fileSize,
          organizationId: params.organizationId,
          status: 'completed',
          parsedAt: new Date(),
          totalQuestions: params.questionsAndAnswers.length,
          answeredQuestions: answeredCount,
          questions: {
            create: params.questionsAndAnswers.map((qa, index) => ({
              question: qa.question,
              answer: qa.answer,
              questionIndex: index,
              status: qa.answer ? 'generated' : 'untouched',
              generatedAt: qa.answer ? new Date() : undefined,
              sources: qa.sources
                ? (qa.sources as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            })),
          },
        },
      });

      this.logger.log('Saved questionnaire result', {
        questionnaireId: questionnaire.id,
        organizationId: params.organizationId,
        source: params.source,
      });

      return questionnaire.id;
    } catch (error) {
      this.logger.error('Failed to save questionnaire result', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId: params.organizationId,
      });
      return null;
    }
  }

  private async uploadQuestionnaireFile(params: {
    organizationId: string;
    fileName: string;
    fileType: string;
    fileData: string;
    source: 'internal' | 'external';
  }): Promise<{ s3Key: string; fileSize: number } | null> {
    if (!s3Client) {
      throw new Error('S3 client not configured for questionnaire uploads');
    }
    const bucket = APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET || BUCKET_NAME;
    if (!bucket) {
      throw new Error(
        'APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET or APP_AWS_BUCKET_NAME must be configured for questionnaire uploads',
      );
    }

    const fileBuffer = Buffer.from(params.fileData, 'base64');

    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      );
    }

    const fileId = randomBytes(16).toString('hex');
    const sanitizedFileName = params.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const s3Key = `${params.organizationId}/questionnaire-uploads/${timestamp}-${fileId}-${sanitizedFileName}`;

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: params.fileType,
      Metadata: {
        originalFileName: params.fileName,
        organizationId: params.organizationId,
        source: params.source,
      },
    });

    await s3Client.send(putCommand);

    return {
      s3Key,
      fileSize: fileBuffer.length,
    };
  }

  /**
   * Saves a generated answer to the database
   * Public wrapper for batch answer generation endpoints
   */
  async saveGeneratedAnswer(params: {
    questionnaireId: string;
    questionIndex: number;
    answer: string;
    sources?: AnswerQuestionResult['sources'];
  }): Promise<void> {
    const question = await db.questionnaireQuestionAnswer.findFirst({
      where: {
        questionnaireId: params.questionnaireId,
        questionIndex: params.questionIndex,
      },
    });

    if (question) {
      await db.questionnaireQuestionAnswer.update({
        where: { id: question.id },
        data: {
          answer: params.answer,
          status: 'generated',
          sources: params.sources
            ? (params.sources as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          generatedAt: new Date(),
        },
      });
    } else {
      await db.questionnaireQuestionAnswer.create({
        data: {
          questionnaireId: params.questionnaireId,
          questionIndex: params.questionIndex,
          question: '', // Unknown at this point
          answer: params.answer,
          status: 'generated',
          sources: params.sources
            ? (params.sources as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          generatedAt: new Date(),
        },
      });
    }

    const answeredCount = await db.questionnaireQuestionAnswer.count({
      where: {
        questionnaireId: params.questionnaireId,
        answer: {
          not: null,
        },
      },
    });

    await db.questionnaire.update({
      where: { id: params.questionnaireId },
      data: {
        answeredQuestions: answeredCount,
        updatedAt: new Date(),
      },
    });
  }
}
