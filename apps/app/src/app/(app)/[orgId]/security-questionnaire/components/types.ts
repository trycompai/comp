export interface QuestionAnswer {
  question: string;
  answer: string | null;
  sources?: Array<{
    sourceType: string;
    sourceName?: string;
    sourceId?: string;
    policyName?: string;
    score: number;
  }>;
  failedToGenerate?: boolean; // Track if auto-generation was attempted but failed
}

