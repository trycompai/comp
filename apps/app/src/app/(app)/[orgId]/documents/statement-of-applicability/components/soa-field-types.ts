export type SOAFieldSavePayload = {
  isApplicable: boolean | null;
  justification: string | null;
};

/**
 * A single control's result from an in-session auto-fill run (streamed over
 * SSE). Shared by the autofill hook and every SoA view so the contract is
 * defined once.
 */
export type SOAProcessedResult = {
  success: boolean;
  isApplicable: boolean | null;
  justification?: string | null;
  insufficientData?: boolean;
};

/**
 * Row-level answer state. `isApplicable` is the persisted per-organization
 * applicability loaded from the document's answers. `savedIsApplicable` is set
 * after a manual save this session to override an in-flight autofill result.
 */
export type SOATableAnswerData = {
  answer: string | null;
  answerVersion: number;
  isApplicable?: boolean | null;
  savedIsApplicable?: boolean | null;
};
