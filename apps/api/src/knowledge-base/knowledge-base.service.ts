import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { tasks, auth } from '@trigger.dev/sdk';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { DeleteDocumentDto } from './dto/delete-document.dto';
import { GetDocumentUrlDto } from './dto/get-document-url.dto';
import { ProcessDocumentsDto } from './dto/process-documents.dto';
import { DeleteManualAnswerDto } from './dto/delete-manual-answer.dto';
import { DeleteAllManualAnswersDto } from './dto/delete-all-manual-answers.dto';
import { processKnowledgeBaseDocumentTask } from '@/trigger/vector-store/process-knowledge-base-document';
import { processKnowledgeBaseDocumentsOrchestratorTask } from '@/trigger/vector-store/process-knowledge-base-documents-orchestrator';
import { deleteKnowledgeBaseDocumentTask } from '@/trigger/vector-store/delete-knowledge-base-document';
import { deleteManualAnswerTask } from '@/trigger/vector-store/delete-manual-answer';
import { deleteAllManualAnswersOrchestratorTask } from '@/trigger/vector-store/delete-all-manual-answers-orchestrator';
import { isViewableInBrowser } from './utils/constants';
import {
  uploadToS3,
  generateDownloadUrl,
  generateViewUrl,
  deleteFromS3,
} from './utils/s3-operations';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  async listDocuments(organizationId: string) {
    return db.knowledgeBaseDocument.findMany({
      where: { organizationId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(dto: UploadDocumentDto) {
    // Upload to S3
    const { s3Key, fileSize } = await uploadToS3(
      dto.organizationId,
      dto.fileName,
      dto.fileType,
      dto.fileData,
    );

    // Create database record
    const document = await db.knowledgeBaseDocument.create({
      data: {
        name: dto.fileName,
        description: dto.description || null,
        s3Key,
        fileType: dto.fileType,
        fileSize,
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
    const document = await this.findDocument(
      dto.documentId,
      dto.organizationId,
    );

    const { signedUrl } = await generateDownloadUrl(
      document.s3Key,
      document.name,
    );

    return {
      signedUrl,
      fileName: document.name,
    };
  }

  async getViewUrl(dto: GetDocumentUrlDto) {
    const document = await this.findDocument(
      dto.documentId,
      dto.organizationId,
    );

    const { signedUrl } = await generateViewUrl(
      document.s3Key,
      document.name,
      document.fileType,
    );

    return {
      signedUrl,
      fileName: document.name,
      fileType: document.fileType,
      viewableInBrowser: isViewableInBrowser(document.fileType),
    };
  }

  async deleteDocument(dto: DeleteDocumentDto) {
    const document = await db.knowledgeBaseDocument.findUnique({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Delete embeddings from vector database (async, non-blocking)
    const vectorDeletionRunId = await this.triggerVectorDeletion(
      document.id,
      dto.organizationId,
    );

    // Create public access token for the deletion run
    const publicAccessToken = vectorDeletionRunId
      ? await this.createRunReadToken(vectorDeletionRunId)
      : undefined;

    // Delete from S3 (non-blocking)
    const s3Deleted = await deleteFromS3(document.s3Key);
    if (!s3Deleted) {
      this.logger.warn('Error deleting file from S3', {
        documentId: document.id,
      });
    }

    // Delete from database
    await db.knowledgeBaseDocument.delete({
      where: { id: dto.documentId },
    });

    return {
      success: true,
      vectorDeletionRunId,
      publicAccessToken,
    };
  }

  async processDocuments(dto: ProcessDocumentsDto) {
    let runId: string | undefined;

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

    // Create public access token for the run
    const publicAccessToken = runId
      ? await this.createRunReadToken(runId)
      : undefined;

    return {
      success: true,
      runId,
      publicAccessToken,
      message:
        dto.documentIds.length > 1
          ? `Processing ${dto.documentIds.length} documents in parallel...`
          : 'Processing document...',
    };
  }

  /**
   * Creates a public access token for reading a specific run
   */
  async createRunReadToken(runId: string): Promise<string | undefined> {
    try {
      const token = await auth.createPublicToken({
        scopes: {
          read: {
            runs: [runId],
          },
        },
        expirationTime: '1hr',
      });
      return token;
    } catch (error) {
      this.logger.warn('Failed to create run read token', {
        runId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  async deleteManualAnswer(
    dto: DeleteManualAnswerDto & { manualAnswerId: string },
  ) {
    const manualAnswer = await db.securityQuestionnaireManualAnswer.findUnique({
      where: {
        id: dto.manualAnswerId,
        organizationId: dto.organizationId,
      },
    });

    if (!manualAnswer) {
      return { success: false, error: 'Manual answer not found' };
    }

    // Trigger vector DB deletion (async)
    await this.triggerManualAnswerVectorDeletion(
      dto.manualAnswerId,
      dto.organizationId,
    );

    // Delete from main DB
    await db.securityQuestionnaireManualAnswer.delete({
      where: { id: dto.manualAnswerId },
    });

    return { success: true };
  }

  async deleteAllManualAnswers(dto: DeleteAllManualAnswersDto) {
    // Get all manual answer IDs before deletion
    const manualAnswers = await db.securityQuestionnaireManualAnswer.findMany({
      where: { organizationId: dto.organizationId },
      select: { id: true },
    });

    this.logger.log('Found manual answers to delete', {
      organizationId: dto.organizationId,
      count: manualAnswers.length,
      ids: manualAnswers.map((ma) => ma.id),
    });

    // Trigger orchestrator for batch vector deletion
    if (manualAnswers.length > 0) {
      await this.triggerBatchManualAnswerDeletion(
        dto.organizationId,
        manualAnswers.map((ma) => ma.id),
      );
    } else {
      this.logger.log('No manual answers to delete', {
        organizationId: dto.organizationId,
      });
    }

    // Delete all from main DB
    await db.securityQuestionnaireManualAnswer.deleteMany({
      where: { organizationId: dto.organizationId },
    });

    return { success: true };
  }

  // Private helper methods

  private async findDocument(documentId: string, organizationId: string) {
    const document = await db.knowledgeBaseDocument.findUnique({
      where: {
        id: documentId,
        organizationId,
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

    return document;
  }

  private async triggerVectorDeletion(
    documentId: string,
    organizationId: string,
  ): Promise<string | undefined> {
    try {
      const handle = await tasks.trigger<
        typeof deleteKnowledgeBaseDocumentTask
      >('delete-knowledge-base-document-from-vector', {
        documentId,
        organizationId,
      });
      return handle.id;
    } catch (error) {
      this.logger.warn('Failed to trigger vector deletion task', {
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return undefined;
    }
  }

  private async triggerManualAnswerVectorDeletion(
    manualAnswerId: string,
    organizationId: string,
  ): Promise<void> {
    try {
      await tasks.trigger<typeof deleteManualAnswerTask>(
        'delete-manual-answer-from-vector',
        { manualAnswerId, organizationId },
      );
      this.logger.log('Triggered delete manual answer from vector DB task', {
        manualAnswerId,
        organizationId,
      });
    } catch (error) {
      this.logger.warn(
        'Failed to trigger delete manual answer from vector DB task',
        {
          manualAnswerId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  private async triggerBatchManualAnswerDeletion(
    organizationId: string,
    manualAnswerIds: string[],
  ): Promise<void> {
    try {
      await tasks.trigger<typeof deleteAllManualAnswersOrchestratorTask>(
        'delete-all-manual-answers-orchestrator',
        { organizationId, manualAnswerIds },
      );
      this.logger.log('Triggered delete all manual answers orchestrator task', {
        organizationId,
        count: manualAnswerIds.length,
      });
    } catch (error) {
      this.logger.warn(
        'Failed to trigger delete all manual answers orchestrator',
        {
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }
}
