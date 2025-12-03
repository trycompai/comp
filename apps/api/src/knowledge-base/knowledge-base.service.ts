import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import { tasks } from '@trigger.dev/sdk';
import { s3Client, APP_AWS_KNOWLEDGE_BASE_BUCKET } from '@/app/s3';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DeleteDocumentDto } from './dto/delete-document.dto';
import { GetDocumentUrlDto } from './dto/get-document-url.dto';
import { ProcessDocumentsDto } from './dto/process-documents.dto';
import { DeleteManualAnswerDto } from './dto/delete-manual-answer.dto';
import { DeleteAllManualAnswersDto } from './dto/delete-all-manual-answers.dto';
import { processKnowledgeBaseDocumentTask } from '@/vector-store/jobs/process-knowledge-base-document';
import { processKnowledgeBaseDocumentsOrchestratorTask } from '@/vector-store/jobs/process-knowledge-base-documents-orchestrator';
import { deleteKnowledgeBaseDocumentTask } from '@/vector-store/jobs/delete-knowledge-base-document';
import { deleteManualAnswerTask } from '@/vector-store/jobs/delete-manual-answer';
import { deleteAllManualAnswersOrchestratorTask } from '@/vector-store/jobs/delete-all-manual-answers-orchestrator';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  async listDocuments(organizationId: string) {
    const documents = await db.knowledgeBaseDocument.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        s3Key: true,
        fileType: true,
        fileSize: true,
        processingStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return documents;
  }

  async uploadDocument(dto: UploadDocumentDto) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
      throw new Error(
        'Knowledge base bucket is not configured. Please set APP_AWS_KNOWLEDGE_BASE_BUCKET environment variable.',
      );
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(dto.fileData, 'base64');

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
      );
    }

    // Generate unique file key
    const fileId = randomBytes(16).toString('hex');
    const sanitizedFileName = dto.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const s3Key = `${dto.organizationId}/knowledge-base-documents/${timestamp}-${fileId}-${sanitizedFileName}`;

    // Sanitize filename for S3 metadata
    const sanitizedMetadataFileName = Buffer.from(dto.fileName, 'utf8')
      .toString('ascii')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\?/g, '_')
      .trim()
      .substring(0, 1024);

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: dto.fileType,
      Metadata: {
        originalFileName: sanitizedMetadataFileName,
        organizationId: dto.organizationId,
      },
    });

    await s3Client.send(putCommand);

    // Create database record
    const document = await db.knowledgeBaseDocument.create({
      data: {
        name: dto.fileName,
        description: dto.description || null,
        s3Key,
        fileType: dto.fileType,
        fileSize: fileBuffer.length,
        organizationId: dto.organizationId,
        processingStatus: 'pending',
      },
    });

    return {
      id: document.id,
      name: document.name,
      s3Key: document.s3Key,
    };
  }

  async getDownloadUrl(dto: GetDocumentUrlDto) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
      throw new Error('Knowledge base bucket is not configured');
    }

    const document = await db.knowledgeBaseDocument.findUnique({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
      select: {
        s3Key: true,
        name: true,
        fileType: true,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Generate signed URL for download
    const command = new GetObjectCommand({
      Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
      Key: document.s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(document.name)}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    return {
      signedUrl,
      fileName: document.name,
    };
  }

  async getViewUrl(dto: GetDocumentUrlDto) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
      throw new Error('Knowledge base bucket is not configured');
    }

    const document = await db.knowledgeBaseDocument.findUnique({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
      select: {
        s3Key: true,
        name: true,
        fileType: true,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Generate signed URL for viewing in browser
    const command = new GetObjectCommand({
      Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
      Key: document.s3Key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(document.name)}"`,
      ResponseContentType: document.fileType || 'application/octet-stream',
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    });

    // Determine if file can be viewed inline in browser
    const viewableInBrowser = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'text/plain',
      'text/html',
      'text/csv',
      'text/markdown',
    ].includes(document.fileType);

    return {
      signedUrl,
      fileName: document.name,
      fileType: document.fileType,
      viewableInBrowser,
    };
  }

  async deleteDocument(dto: DeleteDocumentDto) {
    if (!s3Client) {
      throw new Error('S3 client not configured');
    }

    if (!APP_AWS_KNOWLEDGE_BASE_BUCKET) {
      throw new Error('Knowledge base bucket is not configured');
    }

    // Find the document
    const document = await db.knowledgeBaseDocument.findUnique({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete embeddings from vector database first (async, non-blocking)
    let vectorDeletionRunId: string | undefined;
    try {
      const handle = await tasks.trigger<
        typeof deleteKnowledgeBaseDocumentTask
      >('delete-knowledge-base-document-from-vector', {
        documentId: document.id,
        organizationId: dto.organizationId,
      });
      vectorDeletionRunId = handle.id;
    } catch (triggerError) {
      // Log error but continue with deletion
      this.logger.warn('Failed to trigger vector deletion task', {
        documentId: document.id,
        error:
          triggerError instanceof Error
            ? triggerError.message
            : 'Unknown error',
      });
    }

    // Delete from S3
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: APP_AWS_KNOWLEDGE_BASE_BUCKET,
        Key: document.s3Key,
      });
      await s3Client.send(deleteCommand);
    } catch (s3Error) {
      // Log error but continue with database deletion
      this.logger.warn('Error deleting file from S3', {
        documentId: document.id,
        error: s3Error instanceof Error ? s3Error.message : 'Unknown error',
      });
    }

    // Delete from database
    await db.knowledgeBaseDocument.delete({
      where: {
        id: dto.documentId,
      },
    });

    return {
      success: true,
      vectorDeletionRunId, // Return run ID for tracking deletion progress
    };
  }

  async processDocuments(dto: ProcessDocumentsDto) {
    let runId: string | undefined;

    // Use orchestrator for multiple documents, individual task for single document
    if (dto.documentIds.length > 1) {
      const handle = await tasks.trigger<
        typeof processKnowledgeBaseDocumentsOrchestratorTask
      >('process-knowledge-base-documents-orchestrator', {
        documentIds: dto.documentIds,
        organizationId: dto.organizationId,
      });
      runId = handle.id;
    } else {
      const handle = await tasks.trigger<
        typeof processKnowledgeBaseDocumentTask
      >('process-knowledge-base-document', {
        documentId: dto.documentIds[0],
        organizationId: dto.organizationId,
      });
      runId = handle.id;
    }

    return {
      success: true,
      runId,
      message:
        dto.documentIds.length > 1
          ? `Processing ${dto.documentIds.length} documents in parallel...`
          : 'Processing document...',
    };
  }

  async deleteManualAnswer(
    dto: DeleteManualAnswerDto & { manualAnswerId: string },
  ) {
    // Verify manual answer exists and belongs to organization
    const manualAnswer = await db.securityQuestionnaireManualAnswer.findUnique({
      where: {
        id: dto.manualAnswerId,
        organizationId: dto.organizationId,
      },
    });

    if (!manualAnswer) {
      return {
        success: false,
        error: 'Manual answer not found',
      };
    }

    // Trigger Trigger.dev task to delete from vector DB in background
    // This runs asynchronously and doesn't block the main DB deletion
    try {
      await tasks.trigger<typeof deleteManualAnswerTask>(
        'delete-manual-answer-from-vector',
        {
          manualAnswerId: dto.manualAnswerId,
          organizationId: dto.organizationId,
        },
      );
      this.logger.log('Triggered delete manual answer from vector DB task', {
        manualAnswerId: dto.manualAnswerId,
        organizationId: dto.organizationId,
      });
    } catch (error) {
      // Log error but continue with DB deletion
      this.logger.warn(
        'Failed to trigger delete manual answer from vector DB task',
        {
          manualAnswerId: dto.manualAnswerId,
          organizationId: dto.organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      // Continue with DB deletion even if task trigger fails
    }

    // Delete the manual answer from main DB
    await db.securityQuestionnaireManualAnswer.delete({
      where: {
        id: dto.manualAnswerId,
      },
    });

    return {
      success: true,
    };
  }

  async deleteAllManualAnswers(dto: DeleteAllManualAnswersDto) {
    // First, get all manual answer IDs BEFORE deletion
    // This ensures the orchestrator has the IDs to delete from vector DB
    const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
      where: {
        organizationId: dto.organizationId,
      },
      select: {
        id: true,
      },
    });

    this.logger.log('Found manual answers to delete', {
      organizationId: dto.organizationId,
      count: manualAnswers.length,
      ids: manualAnswers.map((ma) => ma.id),
    });

    // Trigger ONLY the orchestrator task - it will handle all deletions internally
    // The orchestrator uses batchTriggerAndWait to create child tasks for parallel processing
    // We do NOT trigger individual delete tasks here - only the orchestrator
    // Pass the IDs directly to avoid race condition with DB deletion
    if (manualAnswers.length > 0) {
      try {
        await tasks.trigger<typeof deleteAllManualAnswersOrchestratorTask>(
          'delete-all-manual-answers-orchestrator',
          {
            organizationId: dto.organizationId,
            manualAnswerIds: manualAnswers.map((ma) => ma.id), // Pass IDs directly
          },
        );
        this.logger.log(
          'Triggered delete all manual answers orchestrator task',
          {
            organizationId: dto.organizationId,
            count: manualAnswers.length,
          },
        );
      } catch (error) {
        // Log error but continue with DB deletion
        this.logger.warn(
          'Failed to trigger delete all manual answers orchestrator',
          {
            organizationId: dto.organizationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
        // Continue with DB deletion even if orchestrator trigger fails
      }
    } else {
      this.logger.log('No manual answers to delete', {
        organizationId: dto.organizationId,
      });
    }

    // Delete all manual answers from main DB
    // Vector DB deletion happens in background via orchestrator
    await db.securityQuestionnaireManualAnswer.deleteMany({
      where: {
        organizationId: dto.organizationId,
      },
    });

    return {
      success: true,
    };
  }
}
