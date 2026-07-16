import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '@db';
import { isMemberOrgParticipant } from '../utils/org-participation';
import { SaveSOAAnswerDto } from './dto/save-soa-answer.dto';
import { CreateSOADocumentDto } from './dto/create-soa-document.dto';
import { EnsureSOASetupDto } from './dto/ensure-soa-setup.dto';
import { ApproveSOADocumentDto } from './dto/approve-soa-document.dto';
import { DeclineSOADocumentDto } from './dto/decline-soa-document.dto';
import { SubmitSOAForApprovalDto } from './dto/submit-soa-for-approval.dto';
import { ExportSOADocumentDto } from './dto/export-soa-document.dto';
import type { SimilarContentResult } from '@/vector-store/lib';
import { loadISOConfig } from './utils/transform-iso-config';
import {
  FULLY_REMOTE_JUSTIFICATION,
  ISO27001_FRAMEWORK_NAMES,
} from './utils/constants';
import {
  generateSOAExportFile,
  type SOAExportMetadata,
  type SOAExportQuestion,
} from './utils/export-generator';
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
  updateDocumentAfterAutoFill,
  countAnsweredAnswers,
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
      throw new NotFoundException('SOA document not found');
    }

    // The question must belong to this document's configuration, so answers
    // (and the answered-count) can't be created for arbitrary question IDs.
    const configQuestions =
      (document.configuration.questions as unknown as Array<{ id: string }>) ??
      [];
    if (!configQuestions.some((q) => q.id === dto.questionId)) {
      throw new BadRequestException(
        'Question does not belong to this SOA document',
      );
    }

    // Get existing answer to determine the next version and to preserve prior
    // values on partial edits.
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

    // Applicability + justification are stored per organization on the answer.
    // Omitted fields preserve the previous value, so a partial edit (e.g. one
    // that sends only a justification) cannot wipe a prior applicability
    // decision or justification.
    const isApplicable =
      dto.isApplicable === undefined
        ? (existingAnswer?.isApplicable ?? null)
        : dto.isApplicable;
    const justification =
      dto.justification !== undefined
        ? dto.justification
        : dto.answer !== undefined
          ? dto.answer
          : (existingAnswer?.answer ?? null);

    // Validate BEFORE any write, so a rejected save leaves the prior answer
    // intact. ISO 27001: a not-applicable control must carry a justification.
    if (
      isApplicable === false &&
      (!justification || justification.trim().length === 0)
    ) {
      throw new BadRequestException(
        'A justification is required when a control is not applicable',
      );
    }

    const nextVersion = existingAnswer ? existingAnswer.answerVersion + 1 : 1;
    const isAnswered = isApplicable !== null;

    // Retire the prior answer and create the new version atomically, so a
    // failure can never leave the control without a latest answer.
    await db.$transaction([
      ...(existingAnswer
        ? [
            db.sOAAnswer.update({
              where: { id: existingAnswer.id },
              data: { isLatestAnswer: false },
            }),
          ]
        : []),
      db.sOAAnswer.create({
        data: {
          documentId: dto.documentId,
          questionId: dto.questionId,
          answer: justification,
          isApplicable,
          status:
            isAnswered || (justification && justification.trim().length > 0)
              ? 'manual'
              : 'untouched',
          answerVersion: nextVersion,
          isLatestAnswer: true,
          createdBy: existingAnswer ? undefined : userId,
          updatedBy: userId,
        },
      }),
    ]);

    // Update document answered questions count from the per-org answers,
    // scoped to the document's configured questions.
    const answeredCount = await countAnsweredAnswers(
      dto.documentId,
      configQuestions.map((q) => q.id),
    );

    await updateDocumentAnsweredCount(
      dto.documentId,
      document.totalQuestions,
      answeredCount,
    );

    return { success: true };
  }

  async createDocument(dto: CreateSOADocumentDto) {
    const configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    if (!configuration) {
      throw new NotFoundException(
        'No SOA configuration found for this framework',
      );
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
      throw new NotFoundException('Framework not found');
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
        throw new InternalServerErrorException(
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
        throw new InternalServerErrorException(
          `Failed to create SOA document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { success: true, configuration, document };
  }

  async getSetup(dto: EnsureSOASetupDto) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: dto.frameworkId },
    });

    if (!framework) {
      throw new NotFoundException('Framework not found');
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

    const configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    const document = await db.sOADocument.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        isLatest: true,
      },
      include: {
        answers: { where: { isLatestAnswer: true } },
      },
    });

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
      throw new NotFoundException('SOA document not found');
    }

    if (!document.approverId || document.approverId !== member.id) {
      throw new ForbiddenException('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new BadRequestException('Document is not in needs_review status');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        status: 'completed',
        approvedAt: new Date(),
        declinedAt: null,
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
      throw new NotFoundException('SOA document not found');
    }

    if (!document.approverId || document.approverId !== member.id) {
      throw new ForbiddenException('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new BadRequestException('Document is not in needs_review status');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: null,
        approvedAt: null,
        status: 'completed',
        declinedAt: new Date(),
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
      throw new NotFoundException('Approver not found in organization');
    }

    // Cannot assign a platform admin as approver
    const approverUser = await db.user.findUnique({
      where: { id: approverMember.userId },
      select: { role: true },
    });
    if (
      !(await isMemberOrgParticipant(approverUser?.role, dto.organizationId))
    ) {
      throw new BadRequestException(
        'Cannot assign a platform admin as approver',
      );
    }

    const isOwnerOrAdmin =
      approverMember.role.includes('owner') ||
      approverMember.role.includes('admin');
    if (!isOwnerOrAdmin) {
      throw new ForbiddenException('Approver must be an owner or admin');
    }

    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new NotFoundException('SOA document not found');
    }

    if (document.status === 'needs_review') {
      throw new BadRequestException('Document is already pending approval');
    }

    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: dto.approverId,
        approvedAt: null,
        declinedAt: null,
        status: 'needs_review',
      },
    });

    return { success: true, data: updatedDocument };
  }

  async exportDocument(dto: ExportSOADocumentDto): Promise<{
    fileBuffer: Buffer;
    mimeType: string;
    filename: string;
  }> {
    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
      include: {
        configuration: true,
        framework: {
          select: { name: true },
        },
        approver: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        answers: {
          where: { isLatestAnswer: true },
          select: {
            questionId: true,
            answer: true,
            isApplicable: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('SOA document not found');
    }

    const questions =
      (document.configuration.questions as unknown as SOAQuestion[]) ?? [];
    // Applicability + justification come from this organization's own answers,
    // never from the shared framework configuration (which only supplies the
    // control template: title, closure, objective).
    const answersByQuestionId = new Map(
      document.answers.map((answer) => [answer.questionId, answer]),
    );

    // A fully remote org's physical-security (7.x) controls default to Not
    // Applicable, applied identically on screen and in this export.
    const isFullyRemote = await checkIfFullyRemote(
      dto.organizationId,
      this.storageLogger,
    );

    const exportQuestions: SOAExportQuestion[] = questions.map((question) => {
      const answer = answersByQuestionId.get(question.id);
      const closure = question.columnMapping?.closure ?? null;
      // The remote default only fills controls the org has never answered — a
      // saved answer (including an edited one) always wins, so remote physical
      // controls stay editable and the export matches the on-screen SoA.
      const useRemoteDefault =
        answer === undefined &&
        isFullyRemote &&
        isPhysicalSecurityControl(closure ?? '');
      const justification = useRemoteDefault
        ? FULLY_REMOTE_JUSTIFICATION
        : (answer?.answer ?? null);
      return {
        id: question.id,
        text: question.text,
        columnMapping: {
          closure,
          title: question.columnMapping?.title ?? null,
          control_objective: question.columnMapping?.control_objective ?? null,
          isApplicable: useRemoteDefault ? false : (answer?.isApplicable ?? null),
          justification,
        },
        answer: justification,
      };
    });

    const exportMetadata: SOAExportMetadata = {
      preparedBy: (document.preparedBy as string | null) ?? null,
      answeredQuestions: document.answeredQuestions,
      totalQuestions: document.totalQuestions,
      approvedAt: document.approvedAt ?? null,
      declinedAt: (document as { declinedAt?: Date | null }).declinedAt ?? null,
      status: document.status,
      approverName:
        document.approver?.user?.name || document.approver?.user?.email || null,
    };

    return generateSOAExportFile(
      exportQuestions,
      document.framework.name || 'ISO 27001',
      document.version,
      exportMetadata,
      dto.format,
    );
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

    // If no answer, default to YES with a family-appropriate justification
    if (!soaResult.answer) {
      return createDefaultYesResult(question.id, index, send, controlClosure);
    }

    return parseAndProcessSOAAnswer(
      question.id,
      index,
      soaResult.answer,
      send,
      controlClosure,
    );
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

  async countAnsweredAnswers(
    documentId: string,
    validQuestionIds: string[],
  ): Promise<number> {
    return countAnsweredAnswers(documentId, validQuestionIds);
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
      throw new NotFoundException('Member not found');
    }

    const isOwnerOrAdmin =
      member.role.includes('owner') || member.role.includes('admin');

    if (!isOwnerOrAdmin) {
      throw new ForbiddenException(
        'Only owners and admins can perform this action',
      );
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
      throw new NotFoundException('Configuration not found');
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
      throw new NotFoundException('ISO 27001 framework not found');
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
