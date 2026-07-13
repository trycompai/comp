import { describe, expect, it } from 'vitest';
import { FULLY_REMOTE_JUSTIFICATION, resolveSoaDisplay } from './soa-display';

describe('resolveSoaDisplay', () => {
  const base = { isFullyRemote: false, isControl7: false };

  it('uses the persisted per-organization answer', () => {
    // The only source of applicability/justification is this org's own answer.
    // (There is deliberately no shared-configuration input to bleed from.)
    const result = resolveSoaDisplay({
      ...base,
      answerData: {
        answer: 'Our own justification',
        answerVersion: 1,
        isApplicable: false,
      },
    });

    expect(result).toEqual({
      displayIsApplicable: false,
      justificationValue: 'Our own justification',
    });
  });

  it('defaults to applicable with no justification when there is no answer at all', () => {
    const result = resolveSoaDisplay({ ...base, answerData: undefined });

    expect(result).toEqual({
      displayIsApplicable: true,
      justificationValue: null,
    });
  });

  it('shows unanswered (N/A) for an answer whose applicability is unknown, without assuming applicable', () => {
    // Pre-migration answers have a justification but no applicability value.
    // These must not silently render as "applicable"; they read as N/A,
    // consistent with the export, until the org re-runs auto-fill.
    const result = resolveSoaDisplay({
      ...base,
      answerData: {
        answer: 'Existing justification',
        answerVersion: 1,
        isApplicable: null,
      },
    });

    expect(result).toEqual({
      displayIsApplicable: null,
      justificationValue: 'Existing justification',
    });
  });

  it('lets an in-session autofill result override a stale persisted answer', () => {
    const result = resolveSoaDisplay({
      ...base,
      answerData: {
        answer: 'Old persisted justification',
        answerVersion: 1,
        isApplicable: true,
      },
      processedResult: {
        success: true,
        isApplicable: false,
        justification: 'Fresh autofill justification',
      },
    });

    expect(result).toEqual({
      displayIsApplicable: false,
      justificationValue: 'Fresh autofill justification',
    });
  });

  it('lets a manual save this session win over an in-flight autofill result', () => {
    const result = resolveSoaDisplay({
      ...base,
      answerData: {
        answer: 'Manually saved justification',
        answerVersion: 2,
        savedIsApplicable: true,
      },
      processedResult: {
        success: true,
        isApplicable: false,
        justification: 'Autofill justification',
      },
    });

    expect(result).toEqual({
      displayIsApplicable: true,
      justificationValue: 'Manually saved justification',
    });
  });

  it('forces Not Applicable for a fully remote org on physical-security (7.x) controls, even before an answer is persisted', () => {
    const result = resolveSoaDisplay({
      isFullyRemote: true,
      isControl7: true,
      answerData: undefined,
    });

    expect(result).toEqual({
      displayIsApplicable: false,
      justificationValue: FULLY_REMOTE_JUSTIFICATION,
    });
  });
});
