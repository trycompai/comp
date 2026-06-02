import { describe, expect, it } from 'bun:test';
import { evaluateCloudTrail } from '../cloudtrail';
import { evaluateSecurityGroups } from '../ec2';
import { evaluateIamAccount } from '../iam';
import { evaluateKmsRotation } from '../kms';
import {
  evaluateRdsBackups,
  evaluateRdsClusterBackups,
  evaluateRdsClusterEncryption,
  evaluateRdsEncryption,
} from '../rds';
import { evaluateS3Encryption, evaluateS3PublicAccess } from '../s3';

const kinds = (os: { kind: string }[]) => os.map((o) => o.kind);

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
});

const ALL_BLOCKED = {
  blockPublicAcls: true,
  ignorePublicAcls: true,
  blockPublicPolicy: true,
  restrictPublicBuckets: true,
};

describe('AWS S3 evaluators', () => {
  it('encryption: pass when encrypted, fail (high) when not, skip indeterminate', () => {
    const out = evaluateS3Encryption([
      { name: 'a', encrypted: true, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      { name: 'b', encrypted: false, encryptionDetermined: true, publicAccessDetermined: true, bucketBpa: null },
      // read error → indeterminate → excluded (no false high finding)
      { name: 'c', encrypted: false, encryptionDetermined: false, publicAccessDetermined: true, bucketBpa: null },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
    expect(out[1]!.severity).toBe('high');
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
  it('evaluates only rotation-eligible keys with a known status', () => {
    const out = evaluateKmsRotation([
      { keyId: 'sym-on', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: true },
      { keyId: 'sym-off', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: true, rotationEnabled: false },
      // RSA/HMAC/etc. — not rotation-eligible → no finding
      { keyId: 'rsa', region: 'us-east-1', rotationEligible: false, rotationStatusKnown: false, rotationEnabled: false },
      // eligible but status unreadable → no fabricated finding
      { keyId: 'unknown', region: 'us-east-1', rotationEligible: true, rotationStatusKnown: false, rotationEnabled: false },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]!.kind).toBe('pass');
    expect(out[1]!.kind).toBe('fail');
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
