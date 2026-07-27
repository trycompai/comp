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
 * A fully remote org's physical-security (7.x) controls default to Not
 * Applicable, but only when the org has no saved answer yet — a persisted
 * answer (or an in-session edit) always wins, so the control stays editable and
 * the screen agrees with the export. Answers are never locked; the org can move
 * to a physical office at any time.
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

  // No saved answer yet: a fully remote org's physical-security (7.x) controls
  // default to Not Applicable. This is only a default — any saved answer above
  // wins and the field stays editable. The export applies the identical fallback.
  if (isFullyRemote && isControl7) {
    return {
      displayIsApplicable: false,
      justificationValue: FULLY_REMOTE_JUSTIFICATION,
    };
  }

  // No answer for this control yet — default to applicable, matching the
  // server default and the pre-existing UX for an ungenerated SoA.
  return {
    displayIsApplicable: true,
    justificationValue: null,
  };
}
