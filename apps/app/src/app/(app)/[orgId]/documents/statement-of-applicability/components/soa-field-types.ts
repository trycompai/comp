export type SOAFieldSavePayload = {
  isApplicable: boolean | null;
  justification: string | null;
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
