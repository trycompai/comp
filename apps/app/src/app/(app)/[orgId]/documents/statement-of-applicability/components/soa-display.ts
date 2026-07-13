import type { SOATableAnswerData } from './soa-field-types';

export type SOAProcessedResult = {
  success: boolean;
  isApplicable: boolean | null;
  justification?: string | null;
  insufficientData?: boolean;
};

export const FULLY_REMOTE_JUSTIFICATION =
  'This control is not applicable as our organization operates fully remotely.';

/**
 * Resolves the applicability + justification to display for a SoA control.
 *
 * Applicability and justification are per-organization values, sourced only
 * from this document's own answers (`answerData`) or an in-session autofill
 * result (`processedResult`) — never from the shared framework configuration,
 * which is a single row reused by every organization.
 */
export function resolveSoaDisplay({
  answerData,
  processedResult,
  isFullyRemote,
  isControl7,
}: {
  answerData?: SOATableAnswerData;
  processedResult?: SOAProcessedResult;
  isFullyRemote: boolean;
  isControl7: boolean;
}): { displayIsApplicable: boolean | null; justificationValue: string | null } {
  // Fully remote + physical-security control (7.x) is always not applicable.
  if (isFullyRemote && isControl7) {
    return {
      displayIsApplicable: false,
      justificationValue:
        processedResult?.justification ||
        answerData?.answer ||
        FULLY_REMOTE_JUSTIFICATION,
    };
  }

  // A manual save this session overrides an in-flight autofill result.
  if (answerData?.savedIsApplicable !== undefined) {
    return {
      displayIsApplicable: answerData.savedIsApplicable,
      justificationValue: answerData.answer || null,
    };
  }

  // In-session autofill result (before the document is reloaded).
  if (
    processedResult?.isApplicable !== null &&
    processedResult?.isApplicable !== undefined
  ) {
    return {
      displayIsApplicable: processedResult.isApplicable,
      justificationValue:
        processedResult.justification || answerData?.answer || null,
    };
  }

  // Persisted per-organization answer.
  if (
    answerData?.isApplicable !== null &&
    answerData?.isApplicable !== undefined
  ) {
    return {
      displayIsApplicable: answerData.isApplicable,
      justificationValue: answerData.answer || null,
    };
  }

  // Not yet answered — default to applicable (matches the server default).
  return {
    displayIsApplicable: true,
    justificationValue: answerData?.answer || null,
  };
}
