import type { SOAProcessedResult, SOATableAnswerData } from './soa-field-types';

/**
 * Resolves the applicability + justification to display for a SoA control.
 *
 * Applicability and justification are per-organization values, sourced only
 * from this document's own answers (`answerData`) or an in-session autofill
 * result (`processedResult`) — never from the shared framework configuration,
 * and never from a display-only rule. This keeps the on-screen SoA and the
 * exported PDF in agreement (both read the same persisted answer).
 *
 * Note: the "fully remote → physical-security (7.x) controls are not
 * applicable" rule is applied at generation time (auto-fill persists
 * `isApplicable = false` with a justification) and the field is edit-locked, so
 * it is already reflected in the persisted answer read here.
 */
export function resolveSoaDisplay({
  answerData,
  processedResult,
}: {
  answerData?: SOATableAnswerData;
  processedResult?: SOAProcessedResult;
}): { displayIsApplicable: boolean | null; justificationValue: string | null } {
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
