import type { SOAProcessedResult, SOATableAnswerData } from './soa-field-types';

export const FULLY_REMOTE_JUSTIFICATION =
  'This control is not applicable as our organization operates fully remotely.';

/**
 * Resolves the applicability + justification to display for a SoA control.
 *
 * Applicability and justification are per-organization values, sourced from
 * this document's own answers (`answerData`) or an in-session autofill result
 * (`processedResult`) — never from the shared framework configuration.
 *
 * The one enforced rule applied here is "fully remote → physical-security (7.x)
 * controls are Not Applicable". It is applied consistently on both the screen
 * (here) and the export, and the field is edit-locked to it, so a fully remote
 * org sees the same Not Applicable result everywhere even before auto-fill has
 * persisted it.
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
  // Enforced rule: fully remote org + physical-security control (7.x) is Not
  // Applicable. The export applies the same rule, so screen and PDF agree.
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

  // Persisted per-organization answer. A pre-migration answer may not carry an
  // applicability value yet; show it as unanswered (N/A) — matching the export
  // — rather than assuming the control is applicable.
  if (answerData !== undefined) {
    return {
      displayIsApplicable: answerData.isApplicable ?? null,
      justificationValue: answerData.answer || null,
    };
  }

  // No answer for this control yet — default to applicable, matching the
  // server default and the pre-existing UX for an ungenerated SoA.
  return {
    displayIsApplicable: true,
    justificationValue: null,
  };
}
