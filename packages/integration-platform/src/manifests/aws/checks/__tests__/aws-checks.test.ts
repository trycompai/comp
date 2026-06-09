import { describe, expect, it } from 'bun:test';
import { evaluateCloudTrail } from '../cloudtrail';
import { evaluateSecurityGroups } from '../ec2';
import {
  evaluateAccountSummary,
  evaluateIamAccount,
  evaluatePasswordPolicy,
} from '../iam';
import { evaluateKmsRotation } from '../kms';
import {
  evaluateRdsBackups,
  evaluateRdsClusterBackups,
  evaluateRdsClusterEncryption,
  evaluateRdsEncryption,
} from '../rds';
import { evaluateS3Encryption, evaluateS3PublicAccess } from '../s3';
import {
  assumeAwsSession,
  awsAccountIdFromCtx,
  emitOutcomes,
  resolveAwsCredentialInputs,
  type CheckOutcome,
} from '../shared';
import type { CheckContext } from '../../../../types';

const kinds = (os: { kind: string }[]) => os.map((o) => o.kind);

// Minimal CheckContext stub — assumeAwsSession only reads ctx.credentials.
const ctxWith = (credentials: Record<string, unknown>) =>
  ({ credentials }) as unknown as Parameters<typeof assumeAwsSession>[0];

describe('assumeAwsSession — ECS-resolved session injection (CHECK path)', () => {
  const base = {
    roleArn: 'arn:aws:iam::123456789012:role/x',
    externalId: 'eid',
    regions: ['us-east-1', 'eu-west-1'],
  };

  it('uses injected ECS-resolved credentials directly (no STS, no env needed)', async () => {
    const session = await assumeAwsSession(
      ctxWith({
        ...base,
        __resolvedAccessKeyId: 'AKIA_TEMP',
        __resolvedSecretAccessKey: 'secret_temp',
        __resolvedSessionToken: 'token_temp',
      }),
    );
    expect(session).toEqual({
      credentials: {
        accessKeyId: 'AKIA_TEMP',
        secretAccessKey: 'secret_temp',
        sessionToken: 'token_temp',
      },
      regions: ['us-east-1', 'eu-west-1'],
    });
  });

  it('throws the injected error so the caller surfaces the real reason', async () => {
    await expect(
      assumeAwsSession(
        ctxWith({
          ...base,
          __resolvedSessionError: 'The cross-account IAM role could not be assumed.',
        }),
      ),
    ).rejects.toThrow('The cross-account IAM role could not be assumed.');
  });

  it('returns null for a not-configured connection even if creds are injected', async () => {
    const session = await assumeAwsSession(
      ctxWith({
        externalId: 'eid', // roleArn missing -> not configured
        __resolvedAccessKeyId: 'AKIA_TEMP',
        __resolvedSecretAccessKey: 'secret_temp',
        __resolvedSessionToken: 'token_temp',
      }),
    );
    expect(session).toBeNull();
  });

  it('falls back to the in-runtime two-hop when nothing is injected (ECS/dev path)', async () => {
    const prev = process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
    delete process.env.SECURITY_HUB_ROLE_ASSUMER_ARN;
    try {
      // No injected creds + no roleAssumer env -> the fallback runs and fails
      // fast (before any STS call), proving the original path is preserved.
      await expect(assumeAwsSession(ctxWith(base))).rejects.toThrow(
        /SECURITY_HUB_ROLE_ASSUMER_ARN/,
      );
    } finally {
      if (prev !== undefined) process.env.SECURITY_HUB_ROLE_ASSUMER_ARN = prev;
    }
  });
});

describe('AWS credential resolution (regions shape)', () => {
  const base = { roleArn: 'arn:aws:iam::123456789012:role/x', externalId: 'eid' };

  it('honors a multi-element regions array (the normal stored shape)', () => {
    const r = resolveAwsCredentialInputs({
      ...base,
      regions: ['us-east-1', 'us-west-2'],
    });
    expect(r).not.toBeNull();
    expect(r!.regions).toEqual(['us-east-1', 'us-west-2']);
  });

  it('accepts a single region string (resilient to an upstream collapse)', () => {
    const r = resolveAwsCredentialInputs({ ...base, regions: 'us-east-1' });
    expect(r).not.toBeNull();
    expect(r!.regions).toEqual(['us-east-1']);
  });

  it('accepts the legacy singular `region` key', () => {
    const r = resolveAwsCredentialInputs({ ...base, region: 'eu-west-1' });
    expect(r!.regions).toEqual(['eu-west-1']);
  });

  it('returns null when regions resolve to empty (not configured)', () => {
    expect(resolveAwsCredentialInputs({ ...base, regions: [] })).toBeNull();
    expect(resolveAwsCredentialInputs({ ...base, regions: ['  '] })).toBeNull();
  });

  it('returns null when roleArn or externalId is missing', () => {
    expect(
      resolveAwsCredentialInputs({ externalId: 'eid', regions: ['us-east-1'] }),
    ).toBeNull();
    expect(
      resolveAwsCredentialInputs({ roleArn: base.roleArn, regions: ['us-east-1'] }),
    ).toBeNull();
  });
});

describe('AWS IAM account evaluator', () => {
  it('fails on missing policy, root MFA off, and root keys present', () => {
    const out = evaluateIamAccount({
      passwordPolicy: null,
      summary: { AccountMFAEnabled: 0, AccountAccessKeysPresent: 1 },
    });
    expect(out.filter((o) => o.kind === 'fail')).toHaveLength(3);
  });

  it('passes a hardened account', () => {
    const out = evaluateIamAccount({
      passwordPolicy: {
        MinimumPasswordLength: 14,
        RequireSymbols: true,
        RequireNumbers: true,
        RequireUppercaseCharacters: true,
        RequireLowercaseCharacters: true,
      },
      summary: { AccountMFAEnabled: 1, AccountAccessKeysPresent: 0 },
    });
    expect(kinds(out)).toEqual(['pass', 'pass', 'pass']);
  });

  it('password-policy evaluation stands alone (preserved even if summary read fails)', () => {
    // run() emits evaluatePasswordPolicy() before the summary fetch, so a
    // summary failure can no longer discard the password-policy findings.
    const out = evaluatePasswordPolicy(null);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.title).toMatch(/password policy/i);
    // and the summary evaluator is independent
    expect(evaluateAccountSummary({ AccountMFAEnabled: 1, AccountAccessKeysPresent: 0 })).toHaveLength(2);
  });
});

const ALL_BLOCKED = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
};

describe('AWS S3 evaluators', () => {
  it('encryption: pass when encrypted, fail (high) when not, "could not verify" (medium) when indeterminate', () => {
    const out = evaluateS3Encryption([
      { name: 'a', encrypted: true, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      { name: 'b', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      // read error → indeterminate → "could not verify" (not a false high, not silently dropped)
      { name: 'c', encrypted: false, encryptionDetermined: false, publicAccessDetermined: true, bucketBpa: null },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
    expect(out[1]!.severity).toBe('high');
    expect(out[2]!.kind).toBe('fail');
    expect(out[2]!.severity).toBe('medium');
    expect(out[2]!.title).toMatch(/Could not verify/);
  });

  it('encryption: all-indeterminate buckets do not pass silently', () => {
    const out = evaluateS3Encryption([
      { name: 'x', encrypted: false, encryptionDetermined: false, publicAccessDetermined: true, bucketBpa: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.severity).toBe('medium');
  });

  it('public access: bucket-level all-blocked passes, missing fails', () => {
    const out = evaluateS3PublicAccess(
      [
        { name: 'a', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: ALL_BLOCKED },
        { name: 'b', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      ],
      null,
    );
    expect(kinds(out)).toEqual(['pass', 'fail']);
  });

  it('public access: account-level BPA covers buckets lacking bucket config', () => {
    const out = evaluateS3PublicAccess(
      [{ name: 'b', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null }],
      ALL_BLOCKED,
    );
    expect(out[0]!.kind).toBe('pass');
  });
});

describe('AWS EC2 security-group evaluator', () => {
  it('flags SSH (22) open to 0.0.0.0/0 as high', () => {
    const out = evaluateSecurityGroups([
      {
        groupId: 'sg-1',
        region: 'us-east-1',
        permissions: [{ ipProtocol: 'tcp', fromPort: 22, toPort: 22, cidrs: ['0.0.0.0/0'] }],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.severity).toBe('high');
  });

  it('flags IPv6 ::/0 internet-open rules', () => {
    const out = evaluateSecurityGroups([
      {
        groupId: 'sg-6',
        region: 'us-east-1',
        permissions: [{ ipProtocol: 'tcp', fromPort: 22, toPort: 22, cidrs: ['::/0'] }],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
  });

  it('flags all-protocols (-1) open as critical', () => {
    const out = evaluateSecurityGroups([
      { groupId: 'sg-2', region: 'us-east-1', permissions: [{ ipProtocol: '-1', cidrs: ['0.0.0.0/0'] }] },
    ]);
    expect(out[0]!.severity).toBe('critical');
  });

  it('passes a group with no internet-open sensitive ports', () => {
    const out = evaluateSecurityGroups([
      {
        groupId: 'sg-3',
        region: 'us-east-1',
        permissions: [
          { ipProtocol: 'tcp', fromPort: 443, toPort: 443, cidrs: ['0.0.0.0/0'] },
          { ipProtocol: 'tcp', fromPort: 22, toPort: 22, cidrs: ['10.0.0.0/8'] },
        ],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('pass');
  });

  it('does not flag a UDP rule on a TCP-only sensitive port (22)', () => {
    const out = evaluateSecurityGroups([
      {
        groupId: 'sg-udp',
        region: 'us-east-1',
        permissions: [{ ipProtocol: 'udp', fromPort: 22, toPort: 22, cidrs: ['0.0.0.0/0'] }],
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('pass');
  });
});

describe('AWS RDS evaluators', () => {
  it('encryption: pass when encrypted, fail (high) when not', () => {
    const out = evaluateRdsEncryption([
      { id: 'db1', region: 'us-east-1', encrypted: true, backupRetentionDays: 7, engine: 'postgres' },
      { id: 'db2', region: 'us-east-1', encrypted: false, backupRetentionDays: 7, engine: 'postgres' },
    ]);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.severity).toBe('high');
  });

  it('backups: pass when retention > 0, fail when 0, skip Aurora (cluster-level)', () => {
    const out = evaluateRdsBackups([
      { id: 'db1', region: 'us-east-1', encrypted: true, backupRetentionDays: 7, engine: 'postgres' },
      { id: 'db2', region: 'us-east-1', encrypted: true, backupRetentionDays: 0, engine: 'mysql' },
      { id: 'aur', region: 'us-east-1', encrypted: true, backupRetentionDays: 0, engine: 'aurora-mysql' },
    ]);
    expect(kinds(out)).toEqual(['pass', 'fail']); // aurora excluded, not failed
  });

  it('cluster encryption: Aurora evaluated at cluster level (pass/fail)', () => {
    const out = evaluateRdsClusterEncryption([
      { id: 'c1', region: 'us-east-1', encrypted: true, backupRetentionDays: 7, engine: 'aurora-postgresql' },
      { id: 'c2', region: 'us-east-1', encrypted: false, backupRetentionDays: 7, engine: 'aurora-mysql' },
    ]);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
    expect(out[1]!.severity).toBe('high');
  });

  it('cluster backups: Aurora retention evaluated at cluster level (pass/fail)', () => {
    const out = evaluateRdsClusterBackups([
      { id: 'c1', region: 'us-east-1', encrypted: true, backupRetentionDays: 7, engine: 'aurora-mysql' },
      { id: 'c2', region: 'us-east-1', encrypted: true, backupRetentionDays: 0, engine: 'aurora-mysql' },
    ]);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
  });
});

describe('AWS KMS rotation evaluator', () => {
  it('evaluates eligible keys; unreadable rotation status → could-not-verify (not dropped)', () => {
    const out = evaluateKmsRotation([
      { keyId: 'sym-on', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: true },
      { keyId: 'sym-off', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: false },
      // RSA/HMAC/etc. — not rotation-eligible → no finding
      { keyId: 'rsa', region: 'us-east-1', rotationEligible: false, rotationStatusKnown: false, rotationEnabled: false },
      // eligible but status unreadable → "could not verify" (masking a permission gap as clean would be wrong)
      { keyId: 'unknown', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: false, rotationEnabled: false },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
    expect(out[2]!.kind).toBe('fail');
    expect(out[2]!.severity).toBe('medium');
    expect(out[2]!.title).toMatch(/Could not verify/);
  });

  it('does not pass silently when rotation status is unreadable for all eligible keys', () => {
    const out = evaluateKmsRotation([
      { keyId: 'k1', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: false, rotationEnabled: false },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.title).toMatch(/Could not verify/);
  });
});

describe('AWS CloudTrail evaluator', () => {
  it('passes when a multi-region trail with validation is actively logging', () => {
    const out = evaluateCloudTrail([
      { name: 't1', multiRegion: true, logValidation: true, logging: true },
    ]);
    expect(out[0]!.kind).toBe('pass');
  });

  it('fails (medium) when an otherwise-compliant trail is not logging', () => {
    const out = evaluateCloudTrail([
      { name: 't1', multiRegion: true, logValidation: true, logging: false },
    ]);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.severity).toBe('medium');
  });

  it('fails (high) when no trails exist', () => {
    const out = evaluateCloudTrail([]);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.severity).toBe('high');
  });

  it('fails (medium) when a trail exists but is not multi-region + validated', () => {
    const out = evaluateCloudTrail([
      { name: 't1', multiRegion: false, logValidation: true, logging: true },
    ]);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.severity).toBe('medium');
  });

  it('fails "could not verify" when an otherwise-compliant trail status is unreadable', () => {
    // multi-region + validated, but GetTrailStatus failed → loggingKnown=false.
    // Must not assert a false "not logging" failure, but also must not silently
    // pass — emit a "could not verify" failure so the control isn't satisfied.
    const out = evaluateCloudTrail([
      { name: 't1', multiRegion: true, logValidation: true, logging: false, loggingKnown: false },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe('fail');
    expect(out[0]!.title).toMatch(/Could not verify/);
  });
});

describe('IAM/CloudTrail outcomes carry evidence (so the UI shows "View Evidence")', () => {
  const hasEvidence = (o: { evidence?: Record<string, unknown> }) =>
    !!o.evidence && Object.keys(o.evidence).length > 0;

  it('every password-policy outcome has evidence (none / weak / strong)', () => {
    expect(evaluatePasswordPolicy(null).every(hasEvidence)).toBe(true);
    expect(
      evaluatePasswordPolicy({ MinimumPasswordLength: 8 }).every(hasEvidence),
    ).toBe(true);
    expect(
      evaluatePasswordPolicy({
        MinimumPasswordLength: 14,
        RequireSymbols: true,
        RequireNumbers: true,
        RequireUppercaseCharacters: true,
        RequireLowercaseCharacters: true,
      }).every(hasEvidence),
    ).toBe(true);
  });

  it('every root-account-summary outcome has evidence (both states)', () => {
    expect(
      evaluateAccountSummary({
        AccountMFAEnabled: 0,
        AccountAccessKeysPresent: 1,
      }).every(hasEvidence),
    ).toBe(true);
    expect(
      evaluateAccountSummary({
        AccountMFAEnabled: 1,
        AccountAccessKeysPresent: 0,
      }).every(hasEvidence),
    ).toBe(true);
  });

  it('the "No CloudTrail configured" outcome has evidence', () => {
    const out = evaluateCloudTrail([]);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toMatch(/No CloudTrail configured/);
    expect(hasEvidence(out[0]!)).toBe(true);
  });

  it('pass/fail evidence carries the determining value (S3 encryption, KMS rotation)', () => {
    const enc = evaluateS3Encryption([
      { name: 'enc', encrypted: true, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      { name: 'plain', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
    ]);
    expect(enc[0]!.evidence?.encrypted).toBe(true);
    expect(enc[1]!.evidence?.encrypted).toBe(false);

    const rot = evaluateKmsRotation([
      { keyId: 'on', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: true },
      { keyId: 'off', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: false },
    ]);
    expect(rot[0]!.evidence?.rotationEnabled).toBe(true);
    expect(rot[1]!.evidence?.rotationEnabled).toBe(false);
  });
});

// ── AWS account attribution (multi-account findings) ───────────────────────

function captureCtx(credentials: Record<string, unknown>) {
  const passed: Array<{ description: string; evidence?: Record<string, unknown> }> = [];
  const failed: Array<{ description: string; evidence?: Record<string, unknown> }> = [];
  const ctx = {
    credentials,
    pass: (r: { description: string; evidence?: Record<string, unknown> }) =>
      passed.push(r),
    fail: (r: { description: string; evidence?: Record<string, unknown> }) =>
      failed.push(r),
  } as unknown as CheckContext;
  return { ctx, passed, failed };
}

const PASS_OUTCOME: CheckOutcome = {
  kind: 'pass',
  title: 'Default encryption enabled: my-bucket',
  description: 'Bucket "my-bucket" has default encryption enabled.',
  resourceType: 'aws-s3-bucket',
  resourceId: 'my-bucket',
  evidence: { bucket: 'my-bucket', encrypted: true },
};

describe('awsAccountIdFromCtx', () => {
  it('extracts the 12-digit account id from the role ARN', () => {
    expect(
      awsAccountIdFromCtx({
        credentials: { roleArn: 'arn:aws:iam::123456789012:role/CompAIAuditor' },
      } as unknown as CheckContext),
    ).toBe('123456789012');
  });

  it('returns null when the role ARN is missing or malformed', () => {
    expect(
      awsAccountIdFromCtx({ credentials: {} } as unknown as CheckContext),
    ).toBeNull();
    expect(
      awsAccountIdFromCtx({
        credentials: { roleArn: 'not-an-arn' },
      } as unknown as CheckContext),
    ).toBeNull();
  });
});

describe('emitOutcomes — attributes findings to the AWS account', () => {
  it('stamps the account id into evidence and the visible description', () => {
    const { ctx, passed } = captureCtx({
      roleArn: 'arn:aws:iam::123456789012:role/CompAIAuditor',
    });
    emitOutcomes(ctx, [PASS_OUTCOME]);
    expect(passed).toHaveLength(1);
    expect(passed[0]!.evidence?.awsAccountId).toBe('123456789012');
    expect(passed[0]!.evidence?.bucket).toBe('my-bucket'); // original evidence preserved
    expect(passed[0]!.description).toContain('(AWS account 123456789012)');
  });

  it('attributes a fail outcome too', () => {
    const { ctx, failed } = captureCtx({
      roleArn: 'arn:aws:iam::999988887777:role/x',
    });
    emitOutcomes(ctx, [{ ...PASS_OUTCOME, kind: 'fail', severity: 'high' }]);
    expect(failed[0]!.evidence?.awsAccountId).toBe('999988887777');
    expect(failed[0]!.description).toContain('(AWS account 999988887777)');
  });

  it('leaves findings unattributed for key-auth connections (no role ARN)', () => {
    const { ctx, passed } = captureCtx({
      access_key_id: 'AKIA',
      secret_access_key: 'secret',
    });
    emitOutcomes(ctx, [PASS_OUTCOME]);
    expect(passed[0]!.evidence?.awsAccountId).toBeUndefined();
    expect(passed[0]!.description).toBe(PASS_OUTCOME.description); // unchanged
  });
});
