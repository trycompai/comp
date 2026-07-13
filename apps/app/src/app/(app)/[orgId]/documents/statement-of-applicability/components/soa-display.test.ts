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

  it('defaults to applicable with no justification when the control is unanswered', () => {
    const result = resolveSoaDisplay({ ...base, answerData: undefined });

    expect(result).toEqual({
      displayIsApplicable: true,
      justificationValue: null,
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

  it('forces not-applicable for physical-security controls in a fully remote org', () => {
    const result = resolveSoaDisplay({
      isFullyRemote: true,
      isControl7: true,
      answerData: { answer: null, answerVersion: 1, isApplicable: true },
    });

    expect(result).toEqual({
      displayIsApplicable: false,
      justificationValue: FULLY_REMOTE_JUSTIFICATION,
    });
  });
});
