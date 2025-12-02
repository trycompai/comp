import { Injectable, Logger } from '@nestjs/common';
import { db } from '@db';
import { SaveSOAAnswerDto } from './dto/save-soa-answer.dto';
import { CreateSOADocumentDto } from './dto/create-soa-document.dto';
import { EnsureSOASetupDto } from './dto/ensure-soa-setup.dto';
import { ApproveSOADocumentDto } from './dto/approve-soa-document.dto';
import { DeclineSOADocumentDto } from './dto/decline-soa-document.dto';
import { SubmitSOAForApprovalDto } from './dto/submit-soa-for-approval.dto';
import { syncOrganizationEmbeddings } from '@/vector-store/lib';
import { findSimilarContent } from '@/vector-store/lib';
import { deduplicateSources } from '@/questionnaire/utils/deduplicate-sources';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { SimilarContentResult } from '@/vector-store/lib';
import { loadISOConfig } from './utils/transform-iso-config';

@Injectable()
export class SOAService {
  private readonly logger = new Logger(SOAService.name);

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

    // Determine answer value: if isApplicable is NO, use justification; otherwise use provided answer or null
    let finalAnswer: string | null = null;
    if (dto.isApplicable !== undefined) {
      // If isApplicable is provided, use justification if NO, otherwise null
      finalAnswer = dto.isApplicable === false ? (dto.justification || dto.answer || null) : null;
    } else {
      // Fallback to provided answer
      finalAnswer = dto.answer || null;
    }

    // Create or update answer
    await db.sOAAnswer.create({
      data: {
        documentId: dto.documentId,
        questionId: dto.questionId,
        answer: finalAnswer,
        status: finalAnswer && finalAnswer.trim().length > 0 ? 'manual' : 'untouched',
        answerVersion: nextVersion,
        isLatestAnswer: true,
        createdBy: existingAnswer ? undefined : userId,
        updatedBy: userId,
      },
    });

    // Update configuration's question mapping if isApplicable or justification provided
    if (dto.isApplicable !== undefined || dto.justification !== undefined) {
      const configuration = document.configuration;
      const questions = configuration.questions as Array<{
        id: string;
        text: string;
        columnMapping: {
          closure: string;
          title: string;
          control_objective: string | null;
          isApplicable: boolean | null;
          justification: string | null;
        };
      }>;

      const updatedQuestions = questions.map((q) => {
        if (q.id === dto.questionId) {
          return {
            ...q,
            columnMapping: {
              ...q.columnMapping,
              isApplicable: dto.isApplicable !== undefined ? dto.isApplicable : q.columnMapping.isApplicable,
              justification: dto.justification !== undefined ? dto.justification : q.columnMapping.justification,
            },
          };
        }
        return q;
      });

      await db.sOAFrameworkConfiguration.update({
        where: { id: configuration.id },
        data: {
          questions: updatedQuestions,
        },
      });
    }

    // Update document answered questions count
    const updatedConfiguration = await db.sOAFrameworkConfiguration.findUnique({
      where: { id: document.configurationId },
    });
    
    let answeredCount = 0;
    if (updatedConfiguration) {
      const configQuestions = updatedConfiguration.questions as Array<{
        id: string;
        columnMapping: {
          isApplicable: boolean | null;
        };
      }>;
      answeredCount = configQuestions.filter(q => q.columnMapping.isApplicable !== null).length;
    }

    await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        answeredQuestions: answeredCount,
        status: answeredCount === document.totalQuestions ? 'completed' : 'in_progress',
        completedAt: answeredCount === document.totalQuestions ? new Date() : null,
        // Clear approval when answers are edited
        approverId: null,
        approvedAt: null,
      },
    });

    return {
      success: true,
    };
  }

  async createDocument(dto: CreateSOADocumentDto) {
    // Get the latest SOA configuration for this framework
    const configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    if (!configuration) {
      throw new Error('No SOA configuration found for this framework');
    }

    // Check if there's already a latest document for this framework and organization
    const existingLatestDocument = await db.sOADocument.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        isLatest: true,
      },
    });

    // Determine the next version number
    let nextVersion = 1;
    if (existingLatestDocument) {
      // Mark existing document as not latest
      await db.sOADocument.update({
        where: { id: existingLatestDocument.id },
        data: { isLatest: false },
      });
      nextVersion = existingLatestDocument.version + 1;
    }

    // Get questions from configuration to calculate totalQuestions
    const questions = configuration.questions as Array<{ id: string }>;
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    // Create new SOA document
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

    return {
      success: true,
      data: document,
    };
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
          where: {
            isLatestAnswer: true,
          },
        },
      },
    });
  }

  async ensureSetup(dto: EnsureSOASetupDto) {
    // Get framework to check if it's ISO
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: dto.frameworkId },
    });

    if (!framework) {
      throw new Error('Framework not found');
    }

    // Check if framework is ISO 27001 (currently only supported framework)
    const isISO27001 = ['ISO 27001', 'iso27001', 'ISO27001'].includes(framework.name);

    if (!isISO27001) {
      return {
        success: false,
        error: 'Only ISO 27001 framework is currently supported',
        configuration: null,
        document: null,
      };
    }

    // Check if configuration exists
    let configuration = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        isLatest: true,
      },
    });

    // Create configuration if it doesn't exist
    if (!configuration) {
      try {
        configuration = await this.seedISO27001SOAConfig();
      } catch (error) {
        throw new Error(`Failed to create SOA configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Check if document exists
    let document = await db.sOADocument.findFirst({
      where: {
        frameworkId: dto.frameworkId,
        organizationId: dto.organizationId,
        isLatest: true,
      },
      include: {
        answers: {
          where: {
            isLatestAnswer: true,
          },
        },
      },
    });

    // Create document if it doesn't exist
    if (!document && configuration) {
      try {
        document = await this.createSOADocumentDirect(dto.frameworkId, dto.organizationId, configuration.id);
      } catch (error) {
        throw new Error(`Failed to create SOA document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: true,
      configuration,
      document,
    };
  }

  async approveDocument(dto: ApproveSOADocumentDto, userId: string) {
    // Check if user is owner or admin
    const member = await db.member.findFirst({
      where: {
        organizationId: dto.organizationId,
        userId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Check if user has owner or admin role
    const isOwnerOrAdmin = member.role.includes('owner') || member.role.includes('admin');

    if (!isOwnerOrAdmin) {
      throw new Error('Only owners and admins can approve SOA documents');
    }

    // Get the document
    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    // Check if document is pending approval and current member is the approver
    if (!document.approverId || document.approverId !== member.id) {
      throw new Error('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new Error('Document is not in needs_review status');
    }

    // Approve the document
    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        status: 'completed',
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updatedDocument,
    };
  }

  async declineDocument(dto: DeclineSOADocumentDto, userId: string) {
    // Check if user is owner or admin
    const member = await db.member.findFirst({
      where: {
        organizationId: dto.organizationId,
        userId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Check if user has owner or admin role
    const isOwnerOrAdmin = member.role.includes('owner') || member.role.includes('admin');

    if (!isOwnerOrAdmin) {
      throw new Error('Only owners and admins can decline SOA documents');
    }

    // Get the document
    const document = await db.sOADocument.findFirst({
      where: {
        id: dto.documentId,
        organizationId: dto.organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    // Check if document is pending approval and current member is the approver
    if (!document.approverId || document.approverId !== member.id) {
      throw new Error('Document is not pending your approval');
    }

    if (document.status !== 'needs_review') {
      throw new Error('Document is not in needs_review status');
    }

    // Decline the document
    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: null,
        approvedAt: null,
        status: 'completed',
      },
    });

    return {
      success: true,
      data: updatedDocument,
    };
  }

  async submitForApproval(dto: SubmitSOAForApprovalDto) {
    // Verify approver is a member of the organization
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

    // Check if approver is owner or admin
    const isOwnerOrAdmin = approverMember.role.includes('owner') || approverMember.role.includes('admin');
    if (!isOwnerOrAdmin) {
      throw new Error('Approver must be an owner or admin');
    }

    // Get the document
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

    // Submit for approval
    const updatedDocument = await db.sOADocument.update({
      where: { id: dto.documentId },
      data: {
        approverId: dto.approverId,
        status: 'needs_review',
      },
    });

    return {
      success: true,
      data: updatedDocument,
    };
  }

  private async createSOADocumentDirect(frameworkId: string, organizationId: string, configurationId: string) {
    // Check if there's already a latest document for this framework and organization
    const existingLatestDocument = await db.sOADocument.findFirst({
      where: {
        frameworkId,
        organizationId,
        isLatest: true,
      },
    });

    // Determine the next version number
    let nextVersion = 1;
    if (existingLatestDocument) {
      // Mark existing document as not latest
      await db.sOADocument.update({
        where: { id: existingLatestDocument.id },
        data: { isLatest: false },
      });
      nextVersion = existingLatestDocument.version + 1;
    }

    // Get questions from configuration to calculate totalQuestions
    const configuration = await db.sOAFrameworkConfiguration.findUnique({
      where: { id: configurationId },
    });

    if (!configuration) {
      throw new Error('Configuration not found');
    }

    const questions = configuration.questions as Array<{ id: string }>;
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    // Create new SOA document
    const document = await db.sOADocument.create({
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
        answers: {
          where: {
            isLatestAnswer: true,
          },
        },
      },
    });

    return document;
  }

  private async seedISO27001SOAConfig() {
    // Find ISO 27001 framework by name
    const iso27001Framework = await db.frameworkEditorFramework.findFirst({
      where: {
        OR: [
          { name: 'ISO 27001' },
          { name: 'iso27001' },
          { name: 'ISO27001' },
        ],
      },
    });

    if (!iso27001Framework) {
      throw new Error('ISO 27001 framework not found');
    }

    // Check if configuration already exists
    const existingConfig = await db.sOAFrameworkConfiguration.findFirst({
      where: {
        frameworkId: iso27001Framework.id,
        isLatest: true,
      },
    });

    if (existingConfig) {
      return existingConfig;
    }

    // Load and transform ISO config
    const soaConfig = await loadISOConfig();

    // Create new SOA configuration
    const newConfig = await db.sOAFrameworkConfiguration.create({
      data: {
        frameworkId: iso27001Framework.id,
        version: 1,
        isLatest: true,
        columns: soaConfig.columns,
        questions: soaConfig.questions,
      },
    });

    return newConfig;
  }

  async generateSOAAnswerWithRAG(question: string, organizationId: string) {
    try {
      // Find similar content from vector database
      const similarContent = await findSimilarContent(question, organizationId, 5) as SimilarContentResult[];

      this.logger.log('Vector search results for SOA', {
        question: question.substring(0, 100),
        organizationId,
        resultCount: similarContent.length,
      });

      // If no relevant content found, return null
      if (similarContent.length === 0) {
        this.logger.warn('No similar content found in vector database for SOA', {
          question: question.substring(0, 100),
          organizationId,
        });
        return { answer: null, sources: [] };
      }

      // Extract sources information and deduplicate
      const sourcesBeforeDedup = similarContent.map((result) => {
        const r = result as any as SimilarContentResult;
        let sourceName: string | undefined;
        if (r.policyName) {
          sourceName = `Policy: ${r.policyName}`;
        } else if (r.vendorName && r.questionnaireQuestion) {
          sourceName = `Questionnaire: ${r.vendorName}`;
        } else if (r.contextQuestion) {
          sourceName = 'Context Q&A';
        } else if ((r.sourceType as string) === 'manual_answer') {
          sourceName = undefined;
        }

        return {
          sourceType: r.sourceType,
          sourceName,
          sourceId: r.sourceId,
          policyName: r.policyName,
          documentName: r.documentName,
          manualAnswerQuestion: r.manualAnswerQuestion,
          score: r.score,
        };
      });

      const sources = deduplicateSources(sourcesBeforeDedup);

      // Build context from retrieved content
      const contextParts = similarContent.map((result, index) => {
        const r = result as any as SimilarContentResult;
        let sourceInfo = '';
        if (r.policyName) {
          sourceInfo = `Source: Policy "${r.policyName}"`;
        } else if (r.vendorName && r.questionnaireQuestion) {
          sourceInfo = `Source: Questionnaire from "${r.vendorName}"`;
        } else if (r.contextQuestion) {
          sourceInfo = `Source: Context Q&A`;
        } else if ((r.sourceType as string) === 'knowledge_base_document') {
          const docName = r.documentName;
          if (docName) {
            sourceInfo = `Source: Knowledge Base Document "${docName}"`;
          } else {
            sourceInfo = `Source: Knowledge Base Document`;
          }
        } else if ((r.sourceType as string) === 'manual_answer') {
          sourceInfo = `Source: Manual Answer`;
        } else {
          sourceInfo = `Source: ${r.sourceType}`;
        }

        return `[${index + 1}] ${sourceInfo}\n${r.content}`;
      });

      const context = contextParts.join('\n\n');

      // Generate answer using LLM with ISO 27001 compliance analysis prompt
      const { text } = await generateText({
        model: openai('gpt-5-mini'),
        system: `You are an expert organizational analyst conducting a comprehensive assessment of a company for ISO 27001 compliance.

Your task is to analyze the provided context entries and create a structured organizational profile.

ANALYSIS FRAMEWORK:

Extract and categorize information about the organization across these dimensions:
- Business type and industry
- Operational scope and scale
- Risk profile and risk management approach
- Regulatory requirements and compliance posture
- Technical infrastructure and security controls
- Organizational policies and procedures
- Governance structure

CRITICAL RULES - YOU MUST FOLLOW THESE STRICTLY:
1. Answer based EXCLUSIVELY on the provided context from the organization's policies and documentation.
2. DO NOT use general knowledge, assumptions, or information not present in the context.
3. DO NOT hallucinate or invent facts that are not explicitly stated in the context.
4. If the context does not contain enough information to answer the question, respond with exactly: "INSUFFICIENT_DATA"
5. For applicability questions, respond with ONLY "YES" or "NO" - no additional explanation.
6. For justification questions, provide clear, professional explanations (2 sentences) based ONLY on the context provided.
7. Use enterprise-ready language appropriate for ISO 27001 compliance documentation.
8. Always write in first person plural (we, our, us) as if speaking on behalf of the organization.
9. Be precise and factual - base conclusions strictly on the provided evidence.
10. If you cannot find relevant information in the context to answer the question, you MUST respond with "INSUFFICIENT_DATA".`,
        prompt: `Based EXCLUSIVELY on the following context from our organization's policies and documentation, answer this question:

Question: ${question}

Context:
${context}

IMPORTANT: Answer the question based ONLY on the provided context above. DO NOT use any general knowledge or assumptions. If the context does not contain enough information to answer the question, respond with exactly "INSUFFICIENT_DATA". Use first person plural (we, our, us) when answering.`,
      });

      const trimmedAnswer = text.trim();
      
      // Check if the answer indicates insufficient data
      const upperAnswer = trimmedAnswer.toUpperCase();
      if (
        upperAnswer.includes('INSUFFICIENT_DATA') ||
        upperAnswer.includes('N/A') ||
        upperAnswer.includes('NO EVIDENCE FOUND') ||
        upperAnswer.includes('NOT ENOUGH INFORMATION') ||
        upperAnswer.includes('INSUFFICIENT') ||
        upperAnswer.includes('NOT FOUND IN THE CONTEXT') ||
        upperAnswer.includes('NO INFORMATION AVAILABLE')
      ) {
        try {
          const parsed = JSON.parse(trimmedAnswer);
          const isApplicableUpper = parsed.isApplicable?.toUpperCase();
          if (parsed.isApplicable === 'INSUFFICIENT_DATA' || (isApplicableUpper && isApplicableUpper.includes('INSUFFICIENT'))) {
            return {
              answer: null,
              sources,
            };
          }
        } catch {
          return {
            answer: null,
            sources,
          };
        }
      }

      return {
        answer: trimmedAnswer,
        sources,
      };
    } catch (error) {
      this.logger.error('Failed to generate SOA answer with RAG', {
        question: question.substring(0, 100),
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        answer: null,
        sources: [],
      };
    }
  }

  async checkIfFullyRemote(organizationId: string): Promise<boolean> {
    try {
      const teamWorkContext = await db.context.findFirst({
        where: {
          organizationId,
          question: {
            contains: 'How does your team work',
            mode: 'insensitive',
          },
        },
      });

      this.logger.log('Team work context check for SOA auto-fill', {
        organizationId,
        found: !!teamWorkContext,
      });

      if (teamWorkContext?.answer) {
        const answerLower = teamWorkContext.answer.toLowerCase();
        const isFullyRemote = answerLower.includes('fully remote') || answerLower.includes('fully-remote');
        return isFullyRemote;
      }
      return false;
    } catch (error) {
      this.logger.warn('Failed to check team work mode for SOA', {
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async processSOAQuestion(
    question: {
      id: string;
      text: string;
      columnMapping: {
        closure: string;
        title: string;
        control_objective: string | null;
        isApplicable: boolean | null;
        justification: string | null;
      };
    },
    index: number,
    organizationId: string,
    isFullyRemote: boolean,
    send: (data: {
      type: string;
      questionId?: string;
      questionIndex?: number;
      isApplicable?: boolean | null;
      justification?: string | null;
      success?: boolean;
      insufficientData?: boolean;
    }) => void,
  ): Promise<{
    questionId: string;
    isApplicable: boolean | null;
    justification: string | null;
    success: boolean;
    insufficientData: boolean;
  }> {
    const controlClosure = question.columnMapping.closure || '';
    const isControl7 = controlClosure.startsWith('7.');

    // If fully remote and control starts with "7.", skip generation and return NO
    if (isFullyRemote && isControl7) {
      send({
        type: 'answer',
        questionId: question.id,
        questionIndex: index,
        isApplicable: false,
        justification: 'This control is not applicable as our organization operates fully remotely.',
        success: true,
        insufficientData: false,
      });

      return {
        questionId: question.id,
        isApplicable: false,
        justification: 'This control is not applicable as our organization operates fully remotely.',
        success: true,
        insufficientData: false,
      };
    }

    // Single generation request that returns both isApplicable and justification
    const soaQuestion = `Analyze the control "${question.columnMapping.title}" (${question.text}) for our organization.

Based EXCLUSIVELY on our organization's policies, documentation, business context, and operations, determine:

1. Is this control applicable to our organization? Consider:
   - Our business type and industry
   - Our operational scope and scale
   - Our risk profile
   - Our regulatory requirements
   - Our technical infrastructure
   - Our existing policies and governance structure

2. Provide a justification:
   - If applicable: Explain how this control is currently implemented in our organization, including our policies, procedures, or technical measures that address this control.
   - If not applicable: Explain why this control does not apply to our business context, our operational characteristics that make it irrelevant, and our risk profile considerations.

Respond in the following JSON format:
{
  "isApplicable": "YES" or "NO",
  "justification": "Your justification text here (2-3 sentences)"
}

If you cannot find sufficient information in the provided context to answer either question, respond with:
{
  "isApplicable": "INSUFFICIENT_DATA",
  "justification": null
}

IMPORTANT: Base your answer ONLY on information found in our organization's documentation. Do NOT use general knowledge or make assumptions.`;

    const soaResult = await this.generateSOAAnswerWithRAG(soaQuestion, organizationId);

    // If no answer or insufficient data, default to YES (no justification needed)
    if (!soaResult.answer) {
      send({
        type: 'answer',
        questionId: question.id,
        questionIndex: index,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      });

      return {
        questionId: question.id,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      };
    }

    return this.parseAndProcessSOAAnswer(question.id, index, soaResult.answer, send);
  }

  private parseAndProcessSOAAnswer(
    questionId: string,
    index: number,
    answerText: string,
    send: (data: {
      type: string;
      questionId?: string;
      questionIndex?: number;
      isApplicable?: boolean | null;
      justification?: string | null;
      success?: boolean;
      insufficientData?: boolean;
    }) => void,
  ): {
    questionId: string;
    isApplicable: boolean | null;
    justification: string | null;
    success: boolean;
    insufficientData: boolean;
  } {
    // Parse JSON response
    let parsedAnswer: { isApplicable?: string; justification?: string | null } | null = null;
    try {
      parsedAnswer = JSON.parse(answerText);
    } catch {
      const trimmedAnswer = answerText.trim();
      
      // Check for insufficient data indicators - if insufficient, default to YES
      if (
        trimmedAnswer.toUpperCase().includes('INSUFFICIENT_DATA') ||
        trimmedAnswer.toUpperCase().includes('N/A') ||
        trimmedAnswer.toUpperCase().includes('NO EVIDENCE FOUND') ||
        trimmedAnswer.toUpperCase().includes('NOT ENOUGH INFORMATION')
      ) {
        send({
          type: 'answer',
          questionId,
          questionIndex: index,
          isApplicable: true,
          justification: null,
          success: true,
          insufficientData: false,
        });

        return {
          questionId,
          isApplicable: true,
          justification: null,
          success: true,
          insufficientData: false,
        };
      }

      // Try to extract YES/NO and justification from text
      const isApplicableMatch = trimmedAnswer.match(/(?:isApplicable|applicable)[:\s]*["']?(YES|NO|INSUFFICIENT_DATA)["']?/i);
      const justificationMatch = trimmedAnswer.match(/(?:justification)[:\s]*["']?([^"']{20,})["']?/i);
      
      parsedAnswer = {
        isApplicable: isApplicableMatch ? isApplicableMatch[1].toUpperCase() : undefined,
        justification: justificationMatch ? justificationMatch[1].trim() : null,
      };
    }

    // Check for insufficient data - if insufficient, default to YES
    if (
      !parsedAnswer ||
      !parsedAnswer.isApplicable ||
      parsedAnswer.isApplicable === 'INSUFFICIENT_DATA' ||
      parsedAnswer.isApplicable.toUpperCase().includes('INSUFFICIENT')
    ) {
      send({
        type: 'answer',
        questionId,
        questionIndex: index,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      });

      return {
        questionId,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      };
    }

    // Parse isApplicable
    const isApplicableText = parsedAnswer.isApplicable.toUpperCase();
    const isApplicable = isApplicableText.includes('YES') || isApplicableText.includes('APPLICABLE');
    const isNotApplicable = isApplicableText.includes('NO') || isApplicableText.includes('NOT APPLICABLE');

    let finalIsApplicable: boolean | null = null;
    if (isApplicable && !isNotApplicable) {
      finalIsApplicable = true;
    } else if (isNotApplicable && !isApplicable) {
      finalIsApplicable = false;
    } else {
      // Can't determine YES/NO - default to YES
      send({
        type: 'answer',
        questionId,
        questionIndex: index,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      });

      return {
        questionId,
        isApplicable: true,
        justification: null,
        success: true,
        insufficientData: false,
      };
    }

    // Get justification (only if NO)
    const justification = finalIsApplicable === false
      ? (parsedAnswer.justification || null)
      : null;

    send({
      type: 'answer',
      questionId,
      questionIndex: index,
      isApplicable: finalIsApplicable,
      justification,
      success: true,
      insufficientData: false,
    });

    return {
      questionId,
      isApplicable: finalIsApplicable,
      justification,
      success: true,
      insufficientData: false,
    };
  }

  async saveAnswersToDatabase(
    documentId: string,
    questions: Array<{
      id: string;
      text: string;
      columnMapping: {
        closure: string;
        title: string;
        control_objective: string | null;
        isApplicable: boolean | null;
        justification: string | null;
      };
    }>,
    results: Array<{
      questionId: string;
      isApplicable: boolean | null;
      justification: string | null;
      success: boolean;
    }>,
    userId: string,
  ): Promise<void> {
    const successfulResults = results.filter((r) => r.success && r.isApplicable !== null);

    for (const result of successfulResults) {
      const question = questions.find((q) => q.id === result.questionId);
      if (!question) continue;

      try {
        // Get existing answer to determine version
        const existingAnswer = await db.sOAAnswer.findFirst({
          where: {
            documentId,
            questionId: question.id,
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

        // Store justification in answer field only if isApplicable is NO
        const answerValue = result.isApplicable === false ? result.justification : null;

        // Create new answer
        await db.sOAAnswer.create({
          data: {
            documentId,
            questionId: question.id,
            answer: answerValue,
            status: 'generated',
            generatedAt: new Date(),
            answerVersion: nextVersion,
            isLatestAnswer: true,
            createdBy: userId,
          },
        });
      } catch (error) {
        this.logger.error('Failed to save SOA answer', {
          questionId: question.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  async updateConfigurationWithResults(
    configurationId: string,
    configurationQuestions: Array<{
      id: string;
      text: string;
      columnMapping: {
        closure: string;
        title: string;
        control_objective: string | null;
        isApplicable: boolean | null;
        justification: string | null;
      };
    }>,
    results: Array<{
      questionId: string;
      isApplicable: boolean | null;
      justification: string | null;
      success: boolean;
    }>,
  ): Promise<void> {
    const resultsMap = new Map(
      results.filter((r) => r.success && r.isApplicable !== null).map((r) => [r.questionId, r])
    );

    const updatedQuestions = configurationQuestions.map((q) => {
      const result = resultsMap.get(q.id);
      if (result) {
        return {
          ...q,
          columnMapping: {
            ...q.columnMapping,
            isApplicable: result.isApplicable,
            justification: result.justification,
          },
        };
      }
      return q;
    });

    await db.sOAFrameworkConfiguration.update({
      where: { id: configurationId },
      data: {
        questions: updatedQuestions,
      },
    });
  }

  async updateDocumentAfterAutoFill(
    documentId: string,
    totalQuestions: number,
    answeredCount: number,
  ): Promise<void> {
    await db.sOADocument.update({
      where: { id: documentId },
      data: {
        answeredQuestions: answeredCount,
        status: answeredCount === totalQuestions ? 'completed' : 'in_progress',
        completedAt: answeredCount === totalQuestions ? new Date() : null,
        approverId: null,
        approvedAt: null,
      },
    });
  }
}

