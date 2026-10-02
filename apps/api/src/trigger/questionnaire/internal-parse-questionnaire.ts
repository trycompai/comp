import { db } from '@db';
import { logger, metadata, tags, task } from '@trigger.dev/sdk';
import { extractContentFromFile } from '@/questionnaire/utils/content-extractor';
import {
  parseQuestionsAndAnswers,
  type QuestionAnswer,
} from '@/questionnaire/utils/question-parser';
import {
  extractContentFromUrl,
  extractContentFromAttachment,
  extractContentFromS3Key,
  triggerLogger,
} from './parse-questionnaire-extraction';

// Only the permission-gated questionnaire API triggers this task. The old ID
// remains a rejecting task so previously issued browser tokens cannot run it.
export const internalParseQuestionnaireTask = task({
  id: 'internal-parse-questionnaire',
  retry: {
    maxAttempts: 2,
  },
  maxDuration: 60 * 30, // 30 minutes (in seconds) for large PDF questionnaires
  run: async (payload: {
    inputType: 'file' | 'url' | 'attachment' | 's3';
    organizationId: string;
    fileData?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    url?: string;
    attachmentId?: string;
    s3Key?: string;
  }) => {
    const taskStartTime = Date.now();

    await tags.add([`org:${payload.organizationId}`]);

    logger.info('Starting parse questionnaire task', {
      inputType: payload.inputType,
      organizationId: payload.organizationId,
    });

    try {
      let extractedContent: string;

      // Extract content based on input type
      metadata.set('status', 'extracting').set('progress', 10);
      switch (payload.inputType) {
        case 'file': {
          if (!payload.fileData || !payload.fileType) {
            throw new Error(
              'File data and file type are required for file input',
            );
          }
          extractedContent = await extractContentFromFile(
            payload.fileData,
            payload.fileType,
            triggerLogger,
          );
          break;
        }

        case 'url': {
          if (!payload.url) {
            throw new Error('URL is required for URL input');
          }
          extractedContent = await extractContentFromUrl(payload.url);
          break;
        }

        case 'attachment': {
          if (!payload.attachmentId) {
            throw new Error('Attachment ID is required for attachment input');
          }
          const result = await extractContentFromAttachment({
            attachmentId: payload.attachmentId,
            organizationId: payload.organizationId,
          });
          extractedContent = result.content;
          break;
        }

        case 's3': {
          if (!payload.s3Key || !payload.fileType) {
            throw new Error('S3 key and file type are required for S3 input');
          }
          const result = await extractContentFromS3Key({
            s3Key: payload.s3Key,
            fileType: payload.fileType,
          });
          extractedContent = result.content;
          break;
        }

        default:
          throw new Error(`Unsupported input type: ${payload.inputType}`);
      }

      logger.info('Content extracted successfully', {
        inputType: payload.inputType,
        contentLength: extractedContent.length,
      });
      metadata
        .set('status', 'classifying_answerable_items')
        .set('progress', 45)
        .set('extractedContentLength', extractedContent.length);

      // Parse questions and answers from extracted content
      const parseStartTime = Date.now();
      const questionsAndAnswers = await parseQuestionsAndAnswers(
        extractedContent,
        triggerLogger,
      );
      const parseTime = ((Date.now() - parseStartTime) / 1000).toFixed(2);

      const totalTime = ((Date.now() - taskStartTime) / 1000).toFixed(2);

      logger.info('Questions and answers parsed', {
        questionCount: questionsAndAnswers.length,
        parseTimeSeconds: parseTime,
        totalTimeSeconds: totalTime,
      });
      metadata
        .set('status', 'saving_questionnaire')
        .set('progress', 80)
        .set('questionCount', questionsAndAnswers.length);

      // Create questionnaire record in database
      let questionnaireId: string;
      try {
        const fileName =
          payload.fileName ||
          payload.url ||
          payload.attachmentId ||
          'questionnaire';
        const s3Key = payload.s3Key || '';
        const fileType = payload.fileType || 'application/octet-stream';
        const fileSize =
          payload.fileSize ??
          (payload.fileData
            ? Buffer.from(payload.fileData, 'base64').length
            : 0);

        const questionnaire = await db.questionnaire.create({
          data: {
            filename: fileName,
            s3Key: s3Key || '',
            fileType,
            fileSize,
            organizationId: payload.organizationId,
            status: 'completed',
            parsedAt: new Date(),
            totalQuestions: questionsAndAnswers.length,
            answeredQuestions: 0,
            questions: {
              create: questionsAndAnswers.map(
                (qa: QuestionAnswer, index: number) => ({
                  question: qa.question,
                  answer: null,
                  questionIndex: index,
                  status: 'untouched',
                }),
              ),
            },
          },
        });

        questionnaireId = questionnaire.id;

        logger.info('Questionnaire record created', {
          questionnaireId,
          questionCount: questionsAndAnswers.length,
        });
        metadata
          .set('status', 'completed')
          .set('progress', 100)
          .set('questionnaireId', questionnaireId);
      } catch (error) {
        logger.error('Failed to create questionnaire record', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        questionnaireId = '';
      }

      return {
        success: true,
        questionnaireId,
        questionsAndAnswers,
        extractedContent: extractedContent.substring(0, 1000),
      };
    } catch (error) {
      logger.error('Failed to parse questionnaire', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error instanceof Error
        ? error
        : new Error('Failed to parse questionnaire');
    }
  },
});
