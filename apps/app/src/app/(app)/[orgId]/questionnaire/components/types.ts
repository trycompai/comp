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

