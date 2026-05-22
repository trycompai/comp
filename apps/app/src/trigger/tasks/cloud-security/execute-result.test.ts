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
});
