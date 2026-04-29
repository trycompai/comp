export type SOAFieldSavePayload = {
  isApplicable: boolean | null;
  justification: string | null;
};

/** Row-level answer state; `savedIsApplicable` is set after manual save to override autofill. */
export type SOATableAnswerData = {
  answer: string | null;
  answerVersion: number;
  savedIsApplicable?: boolean | null;
};
