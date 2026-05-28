import { describe, expect, it } from 'vitest';
import { classifyRetryPreview } from './retry-preview';

describe('classifyRetryPreview', () => {
  it('continues when preview has no blockers', () => {
    expect(classifyRetryPreview(undefined)).toEqual({ type: 'continue' });
    expect(classifyRetryPreview({})).toEqual({ type: 'continue' });
  });

  it('preserves missing permission retry flow', () => {
    expect(
      classifyRetryPreview({ missingPermissions: ['ec2:RevokeSecurityGroupIngress'] }),
    ).toEqual({
      type: 'needs_permissions',
      missingPermissions: ['ec2:RevokeSecurityGroupIngress'],
    });
  });

  it('stops guided-only retries before execute', () => {
    expect(classifyRetryPreview({ guidedOnly: true })).toEqual({
      type: 'manual',
      error: 'This finding requires manual remediation and cannot be auto-fixed.',
    });
  });
});
