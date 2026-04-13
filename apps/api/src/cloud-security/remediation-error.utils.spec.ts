import { parseAwsPermissionError } from './remediation-error.utils';

describe('parseAwsPermissionError', () => {
  it('detects "required X permission" pattern', () => {
    const msg =
      'The request was rejected because you do not have the required iam:CreateServiceLinkedRole permission.';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(true);
    expect(result.missingActions).toContain('iam:CreateServiceLinkedRole');
  });

  it('detects "not authorized to perform" pattern', () => {
    const msg =
      'User: arn:aws:sts::123456789012:assumed-role/CompAI-Remediator/session is not authorized to perform: guardduty:CreateDetector on resource: *';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(true);
    expect(result.missingActions).toContain('guardduty:CreateDetector');
  });

  it('detects AccessDeniedException', () => {
    const msg = 'AccessDeniedException: User is not authorized to perform: kms:EnableKeyRotation';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(true);
    expect(result.missingActions).toContain('kms:EnableKeyRotation');
  });

  it('detects access denied with action', () => {
    const msg = 'Access Denied for action: s3:PutBucketEncryption';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(true);
    expect(result.missingActions).toContain('s3:PutBucketEncryption');
  });

  it('detects permission error without extractable action', () => {
    const msg = 'Access Denied';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(true);
    expect(result.missingActions).toEqual([]);
  });

  it('returns false for non-permission errors', () => {
    const msg = 'ResourceNotFoundException: Detector not found';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(false);
    expect(result.missingActions).toEqual([]);
  });

  it('returns false for network errors', () => {
    const msg = 'NetworkingError: connect ECONNREFUSED';
    const result = parseAwsPermissionError(msg);
    expect(result.isPermissionError).toBe(false);
  });

  it('preserves rawMessage', () => {
    const msg = 'some error with not authorized text';
    const result = parseAwsPermissionError(msg);
    expect(result.rawMessage).toBe(msg);
  });
});
