import { describe, expect, it } from 'vitest';
import { classifyExecuteResult } from './execute-result';

describe('classifyExecuteResult', () => {
  it('requires an explicit success status before reporting success', () => {
    expect(classifyExecuteResult({ status: 'success', actionId: 'act_123' })).toEqual({
      type: 'success',
      actionId: 'act_123',
    });
  });

  it('treats empty objects as invalid responses', () => {
    expect(classifyExecuteResult({})).toEqual({
      type: 'failed',
      error: 'API returned an invalid remediation response',
    });
  });

  it('treats missing response data as an empty response', () => {
    expect(classifyExecuteResult(undefined)).toEqual({
      type: 'failed',
      error: 'API returned an empty remediation response',
    });
  });

  it('does not report unknown statuses as fixed', () => {
    expect(classifyExecuteResult({ status: 'queued' })).toEqual({
      type: 'failed',
      error: 'API returned an invalid remediation response',
    });
  });

  it('preserves permission errors for retry flows', () => {
    expect(
      classifyExecuteResult({
        status: 'failed',
        error: 'Access denied',
        permissionError: {
          missingActions: ['s3:CreateBucket'],
          fixScript: 'aws iam put-role-policy ...',
        },
      }),
    ).toEqual({
      type: 'needs_permissions',
      error: 'Access denied',
      permissionError: {
        missingActions: ['s3:CreateBucket'],
        fixScript: 'aws iam put-role-policy ...',
      },
    });
  });

  // ─── Manual-steps fallback (new in this PR) ────────────────────────

  it('classifies a guidedOnly response with steps as the new manual type', () => {
    expect(
      classifyExecuteResult({
        status: 'failed',
        error: 'Plan still invalid after AI repair.',
        guidedOnly: true,
        guidedSteps: [
          'Open AWS Console → CloudTrail',
          'Create a new multi-region trail named compai-cloudtrail',
        ],
      }),
    ).toEqual({
      type: 'manual',
      reason: 'Plan still invalid after AI repair.',
      guidedSteps: [
        'Open AWS Console → CloudTrail',
        'Create a new multi-region trail named compai-cloudtrail',
      ],
    });
  });

  it('falls back to a generic reason when manual response omits error text', () => {
    const result = classifyExecuteResult({
      guidedOnly: true,
      guidedSteps: ['Do thing X'],
    });
    expect(result.type).toBe('manual');
    if (result.type !== 'manual') return;
    expect(result.reason).toMatch(/Automatic fix could not be applied/i);
    expect(result.guidedSteps).toEqual(['Do thing X']);
  });

  it('does NOT trigger the manual type when guidedOnly is true but steps are missing or empty', () => {
    // Must have BOTH the flag and a non-empty list. Without real steps,
    // the customer would see "manual mode" with nothing to do.
    expect(
      classifyExecuteResult({ guidedOnly: true, guidedSteps: [] }).type,
    ).not.toBe('manual');
    expect(
      classifyExecuteResult({ guidedOnly: true }).type,
    ).not.toBe('manual');
    expect(
      classifyExecuteResult({
        guidedOnly: true,
        guidedSteps: ['', '   '],
      }).type,
    ).not.toBe('manual');
  });

  it('strips non-string entries from guidedSteps before declaring manual', () => {
    const result = classifyExecuteResult({
      guidedOnly: true,
      guidedSteps: ['valid step', 42, null, 'another step'],
    });
    expect(result.type).toBe('manual');
    if (result.type !== 'manual') return;
    expect(result.guidedSteps).toEqual(['valid step', 'another step']);
  });

  it('prefers permission-error classification over manual when both fields are present', () => {
    // Permission errors have a polished dedicated UX (fixScript). Don't
    // shadow them with a generic manual-steps view.
    const result = classifyExecuteResult({
      status: 'failed',
      error: 'Access denied',
      permissionError: { missingActions: ['s3:CreateBucket'] },
      guidedOnly: true,
      guidedSteps: ['Do something'],
    });
    expect(result.type).toBe('needs_permissions');
  });
});
