// Shared types for questionnaire module — used by server pages and client components
// These replace the old `Awaited<ReturnType<typeof import('...data/queries')...>>` patterns

export interface QuestionnaireListItem {
  id: string;
  filename: string;
  fileType: string;
  status: string;
  totalQuestions: number;
  answeredQuestions: number;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  questions: Array<{
    id: string;
    question: string;
    answer: string | null;
    status: string;
    questionIndex: number;
  }>;
}

export interface PublishedPolicy {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContextEntry {
  id: string;
  question: string;
  answer: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ManualAnswer {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  sourceQuestionnaireId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KBDocument {
  id: string;
  name: string;
  description: string | null;
  s3Key: string;
  fileType: string;
  fileSize: number;
  processingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string | null;
  sources?: Array<{
    sourceType: string;
    sourceName?: string;
    sourceId?: string;
    policyName?: string;
    documentName?: string;
    score: number;
  }>;
  failedToGenerate?: boolean; // Track if auto-generation was attempted but failed
  status?: 'untouched' | 'generated' | 'manual'; // Track answer source: untouched, AI-generated, or manually edited
  // Optional field used when converting QuestionnaireResult to QuestionAnswer for orchestrator
  // Preserves the original index from QuestionnaireResult.originalIndex
  _originalIndex?: number;
}

