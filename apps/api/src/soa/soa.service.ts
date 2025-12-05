import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { SaveSOAAnswerDto } from './dto/save-soa-answer.dto';
import { CreateSOADocumentDto } from './dto/create-soa-document.dto';
import { EnsureSOASetupDto } from './dto/ensure-soa-setup.dto';
import { ApproveSOADocumentDto } from './dto/approve-soa-document.dto';
import { DeclineSOADocumentDto } from './dto/decline-soa-document.dto';
import { SubmitSOAForApprovalDto } from './dto/submit-soa-for-approval.dto';
import type { SimilarContentResult } from '@/vector-store/lib';
import { loadISOConfig } from './utils/transform-iso-config';
import { ISO27001_FRAMEWORK_NAMES } from './utils/constants';
import {
  batchSearchSOAQuestions,
  generateSOAAnswerWithRAG,
  generateSOAControlAnswer,
} from './utils/soa-answer-generator';
import {
  parseAndProcessSOAAnswer,
  createDefaultYesResult,
  createFullyRemoteResult,
  isPhysicalSecurityControl,
  type SOAQuestion,
  type SOAQuestionResult,
  type SOAStreamSender,
} from './utils/soa-answer-parser';
import {
  saveAnswersToDatabase,
  updateConfigurationWithResults,
  updateDocumentAfterAutoFill,
  getAnsweredCountFromConfiguration,
  updateDocumentAnsweredCount,
  checkIfFullyRemote,
  type SOAStorageLogger,
} from './utils/soa-storage';

@Injectable()
export class SOAService {
  private readonly logger = new Logger(SOAService.name);

  private get storageLogger(): SOAStorageLogger {
    return {
      log: (msg, meta) => this.logger.log(msg, meta),
      error: (msg, meta) => this.logger.error(msg, meta),
    };
  }

  async saveAnswer(dto: SaveSOAAnswerDto, userId: string) {
    // Verify document exists and belongs to organization
    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
      include: {
        configuration: true,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    // Get existing answer to determine version
    const existingAnswer = await db.sOAAnswer.findFirst({
      where: {
        documentId: dto.documentId,
        questionId: dto.questionId,
        isLatestAnswer: true,
      },
      orderBy: {
        answerVersion: 'desc',
      },
    });

    const nextVersion = existingAnswer ? existingAnswer.answerVersion + 1 : 1;

    // Mark existing answer as not latest if it exists
    if (existingAnswer) {
      await db.sOAAnswer.update({
        where: { id: existingAnswer.id },
        data: { isLatestAnswer: false },
      });
    }

    // Determine answer value
    let finalAnswer: string | null = null;
    if (dto.isApplicable !== undefined) {
      finalAnswer =
        dto.isApplicable === false
          ? dto.justification || dto.answer || null
          : null;
    } else {
      finalAnswer = dto.answer || null;
    }

    // Create or update answer
    await db.sOAAnswer.create({
      data: {
        documentId: dto.documentId,
        questionId: dto.questionId,
        answer: finalAnswer,
        status:
          finalAnswer && finalAnswer.trim().length > 0 ? 'manual' : 'untouched',
        answerVersion: nextVersion,
        isLatestAnswer: true,
        createdBy: existingAnswer ? undefined : userId,
        updatedBy: userId,
      },
    });

    // Update configuration's question mapping if isApplicable or justification provided
    if (dto.isApplicable !== undefined || dto.justification !== undefined) {
      await this.updateQuestionMapping(
        document.configuration.id,
        dto.questionId,
        dto.isApplicable ?? undefined,
        dto.justification ?? undefined,
      );
    }

    // Update document answered questions count
    const answeredCount = await getAnsweredCountFromConfiguration(
      document.configurationId,
    );

    await updateDocumentAnsweredCount(
      dto.documentId,
      document.totalQuestions,
      answeredCount,
    );

    return { success: true };
  }

  private async updateQuestionMapping(
    configurationId: string,
    questionId: string,
    isApplicable: boolean | undefined,
    justification: string | undefined,
  ) {
    const configuration = await db.sOAFrameworkConfiguration.findUnique({
      where: { id: configurationId },
    });

    if (!configuration) return;

    const questions = configuration.questions as unknown as SOAQuestion[];
    const updatedQuestions = questions.map((q) => {
      if (q.id === questionId) {
        return {
          ...q,
          columnMapping: {
            ...q.columnMapping,
            isApplicable:
              isApplicable !== undefined
                ? isApplicable
                : q.columnMapping.isApplicable,
            justification:
              justification !== undefined
                ? justification
                : q.columnMapping.justification,
          },
        };
      }
      return q;
    });

    await db.sOAFrameworkConfiguration.update({
      where: { id: configurationId },
      data: { questions: JSON.parse(JSON.stringify(updatedQuestions)) },
    });
  }

  async createDocument(dto: CreateSOADocumentDto) {
    const configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    if (!configuration) {
      throw new Error('No SOA configuration found for this framework');
    }

    const existingLatestDocument = await db.sOADocument.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        isLatest: true,
      },
    });

    let nextVersion = 1;
    if (existingLatestDocument) {
      await db.sOADocument.update({
        where: { id: existingLatestDocument.id },
        data: { isLatest: false },
      });
      nextVersion = existingLatestDocument.version + 1;
    }

    const questions = configuration.questions as Array<{ id: string }>;
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    const document = await db.sOADocument.create({
      data: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        configurationId: configuration.id,
        version: nextVersion,
        isLatest: true,
        status: 'draft',
        totalQuestions,
        answeredQuestions: 0,
      },
      include: {
        framework: true,
        configuration: true,
      },
    });

    return { success: true, data: document };
  }

  async getDocument(documentId: string, organizationId: string) {
    return db.sOADocument.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
      include: {
        framework: true,
        configuration: true,
        answers: {
          where: { isLatestAnswer: true },
        },
      },
    });
  }

  async ensureSetup(dto: EnsureSOASetupDto) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: dto.frameworkId },
    });

    if (!framework) {
      throw new Error('Framework not found');
    }

    const isISO27001 = ISO27001_FRAMEWORK_NAMES.includes(framework.name);

    if (!isISO27001) {
      return {
        success: false,
        error: 'Only ISO 27001 framework is currently supported',
        configuration: null,
        document: null,
      };
    }

    let configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    if (!configuration) {
      try {
        configuration = await this.seedISO27001SOAConfig();
      } catch (error) {
        throw new Error(
          `Failed to create SOA configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    let document = await db.sOADocument.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        isLatest: true,
      },
      include: {
        answers: { where: { isLatestAnswer: true } },
      },
    });

    if (!document && configuration) {
      try {
        document = await this.createSOADocumentDirect(
          dto.frameworkId,
          dto.organizationId,
          configuration.id,
        );
      } catch (error) {
        throw new Error(
          `Failed to create SOA document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { success: true, configuration, document };
  }

  async approveDocument(dto: ApproveSOADocumentDto, userId: string) {
    const member = await this.validateOwnerOrAdmin(dto.organizationId, userId);

    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    if (!document.approverId || document.approverId !== member.id) {
      throw new Error('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new Error('Document is not in needs_review status');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        status: 'completed',
        approvedAt: new Date(),
      },
    });

    return { success: true, data: updatedDocument };
  }

  async declineDocument(dto: DeclineSOADocumentDto, userId: string) {
    const member = await this.validateOwnerOrAdmin(dto.organizationId, userId);

    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    if (!document.approverId || document.approverId !== member.id) {
      throw new Error('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new Error('Document is not in needs_review status');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: null,
        approvedAt: null,
        status: 'completed',
      },
    });

    return { success: true, data: updatedDocument };
  }

  async submitForApproval(dto: SubmitSOAForApprovalDto) {
    const approverMember = await db.member.findFirst({
      where: {
        id: dto.approverId,
        organizationId: dto.organizationId,
        deactivated: false,
      },
    });

    if (!approverMember) {
      throw new Error('Approver not found in organization');
    }

    const isOwnerOrAdmin =
      approverMember.role.includes('owner') ||
      approverMember.role.includes('admin');
    if (!isOwnerOrAdmin) {
      throw new Error('Approver must be an owner or admin');
    }

    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    if (document.status === 'needs_review') {
      throw new Error('Document is already pending approval');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: dto.approverId,
        status: 'needs_review',
      },
    });

    return { success: true, data: updatedDocument };
  }

  // Auto-fill related methods (delegating to utilities)

  async checkIfFullyRemote(organizationId: string): Promise<boolean> {
    return checkIfFullyRemote(organizationId, this.storageLogger);
  }

  async batchSearchSOAQuestions(
    questions: SOAQuestion[],
    organizationId: string,
  ): Promise<Map<string, SimilarContentResult[]>> {
    return batchSearchSOAQuestions(questions, organizationId);
  }

  async processSOAQuestionWithContent(
    question: SOAQuestion,
    index: number,
    similarContent: SimilarContentResult[],
    isFullyRemote: boolean,
    send: SOAStreamSender,
  ): Promise<SOAQuestionResult> {
    const controlClosure = question.columnMapping.closure || '';

    // If fully remote and control is physical security (section 7), return NO
    if (isFullyRemote && isPhysicalSecurityControl(controlClosure)) {
      return createFullyRemoteResult(question.id, index, send);
    }

    // Generate answer from pre-fetched content
    const soaResult = await generateSOAControlAnswer(question, similarContent);

    // If no answer, default to YES
    if (!soaResult.answer) {
      return createDefaultYesResult(question.id, index, send);
    }

    return parseAndProcessSOAAnswer(question.id, index, soaResult.answer, send);
  }

  async saveAnswersToDatabase(
    documentId: string,
    questions: SOAQuestion[],
    results: SOAQuestionResult[],
    userId: string,
  ): Promise<void> {
    return saveAnswersToDatabase(
      documentId,
      questions,
      results,
      userId,
      this.storageLogger,
    );
  }

  async updateConfigurationWithResults(
    configurationId: string,
    questions: SOAQuestion[],
    results: SOAQuestionResult[],
  ): Promise<void> {
    return updateConfigurationWithResults(configurationId, questions, results);
  }

  async updateDocumentAfterAutoFill(
    documentId: string,
    totalQuestions: number,
    answeredCount: number,
  ): Promise<void> {
    return updateDocumentAfterAutoFill(
      documentId,
      totalQuestions,
      answeredCount,
    );
  }

  // Private helper methods

  private async validateOwnerOrAdmin(organizationId: string, userId: string) {
    const member = await db.member.findFirst({
      where: {
        organizationId,
        userId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const isOwnerOrAdmin =
      member.role.includes('owner') || member.role.includes('admin');

    if (!isOwnerOrAdmin) {
      throw new Error('Only owners and admins can perform this action');
    }

    return member;
  }

  private async createSOADocumentDirect(
    frameworkId: string,
    organizationId: string,
    configurationId: string,
  ) {
    const existingLatestDocument = await db.sOADocument.findFirst({
      where: {
        frameworkId,
        organizationId,
        isLatest: true,
      },
    });

    let nextVersion = 1;
    if (existingLatestDocument) {
      await db.sOADocument.update({
        where: { id: existingLatestDocument.id },
        data: { isLatest: false },
      });
      nextVersion = existingLatestDocument.version + 1;
    }

    const configuration = await db.sOAFrameworkConfiguration.findUnique({
      where: { id: configurationId },
    });

    if (!configuration) {
      throw new Error('Configuration not found');
    }

    const questions = configuration.questions as Array<{ id: string }>;
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    return db.sOADocument.create({
      data: {
        frameworkId,
        organizationId,
        configurationId: configuration.id,
        version: nextVersion,
        isLatest: true,
        status: 'draft',
        totalQuestions,
        answeredQuestions: 0,
      },
      include: {
        answers: { where: { isLatestAnswer: true } },
      },
    });
  }

  private async seedISO27001SOAConfig() {
    const iso27001Framework = await db.frameworkEditorFramework.findFirst({
      where: {
        OR: ISO27001_FRAMEWORK_NAMES.map((name) => ({ name })),
      },
    });

    if (!iso27001Framework) {
      throw new Error('ISO 27001 framework not found');
    }

    const existingConfig = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: iso27001Framework.id,
        isLatest: true,
      },
    });

    if (existingConfig) {
      return existingConfig;
    }

    const soaConfig = await loadISOConfig();

    return db.sOAFrameworkConfiguration.create({
      data: {
        frameworkId: iso27001Framework.id,
        version: 1,
        isLatest: true,
        columns: soaConfig.columns,
        questions: soaConfig.questions,
      },
    });
  }
}
