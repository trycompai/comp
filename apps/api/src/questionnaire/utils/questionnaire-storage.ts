import { db, Prisma } from '@db';
import {
  s3Client,
  APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET,
  BUCKET_NAME,
} from '../../app/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import { MAX_FILE_SIZE_BYTES } from './constants';

export interface QuestionnaireAnswerData {
  question: string;
  answer: string | null;
  sources?: unknown;
}

export interface StorageLogger {
  log: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

const defaultLogger: StorageLogger = {
  log: () => {},
  error: () => {},
};

/**
 * Updates the answered questions count for a questionnaire
 */
export async function updateAnsweredCount(
  questionnaireId: string,
): Promise<void> {
  const answeredCount = await db.questionnaireQuestionAnswer.count({
    where: {
      questionnaireId,
      answer: { not: null },
    },
  });

  await db.questionnaire.update({
    where: { id: questionnaireId },
    data: {
      answeredQuestions: answeredCount,
      updatedAt: new Date(),
    },
  });
}

/**
 * Persists a questionnaire result to the database
 */
export async function persistQuestionnaireResult(
  params: {
    organizationId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    questionsAndAnswers: QuestionnaireAnswerData[];
    source: 'internal' | 'external';
    s3Key: string | null;
  },
  logger: StorageLogger = defaultLogger,
): Promise<string | null> {
  try {
    const answeredCount = params.questionsAndAnswers.filter(
      (qa) => qa.answer && qa.answer.trim().length > 0,
    ).length;

    const questionnaire = await db.questionnaire.create({
      data: {
        filename: params.fileName,
        s3Key: params.s3Key ?? '',
        fileType: params.fileType,
        fileSize: params.fileSize,
        organizationId: params.organizationId,
        status: 'completed',
        parsedAt: new Date(),
        totalQuestions: params.questionsAndAnswers.length,
        answeredQuestions: answeredCount,
        source: params.source,
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

    logger.log('Saved questionnaire result', {
      questionnaireId: questionnaire.id,
      organizationId: params.organizationId,
      source: params.source,
    });

    return questionnaire.id;
  } catch (error) {
    logger.error('Failed to save questionnaire result', {
      error: error instanceof Error ? error.message : 'Unknown error',
      organizationId: params.organizationId,
    });
    return null;
  }
}

/**
 * Uploads a questionnaire file to S3
 */
export async function uploadQuestionnaireFile(params: {
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
 */
export async function saveGeneratedAnswer(params: {
  questionnaireId: string;
  questionIndex: number;
  answer: string;
  sources?: unknown;
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
        question: '',
        answer: params.answer,
        status: 'generated',
        sources: params.sources
          ? (params.sources as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        generatedAt: new Date(),
      },
    });
  }

  await updateAnsweredCount(params.questionnaireId);
}
