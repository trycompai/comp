import {
  IAMClient,
  GetAccountPasswordPolicyCommand,
  ListUsersCommand,
  ListMFADevicesCommand,
  ListAccessKeysCommand,
  GetAccountSummaryCommand,
} from '@aws-sdk/client-iam';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const STALE_KEY_DAYS = 90;

export class IamAdapter implements AwsServiceAdapter {
  readonly serviceId = 'iam-analyzer';
  readonly isGlobal = true;

  async scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const { credentials, region, accountId } = params;
    const iam = new IAMClient({ region, credentials });

    const findings: SecurityFinding[] = [];

    const results = await Promise.allSettled([
      this.checkPasswordPolicy(iam, accountId),
      this.checkUsersWithoutMfa(iam, accountId),
      this.checkStaleAccessKeys(iam, accountId),
      this.checkRootAccessKeys(iam, accountId),
    ]);

    for (const result of results) {
      if (result.status === 'fulfilled') {
        findings.push(...result.value);
      }
    }

    return findings;
  }

  private async checkPasswordPolicy(
    iam: IAMClient,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const resp = await iam.send(new GetAccountPasswordPolicyCommand({}));
      const policy = resp.PasswordPolicy;

      if (!policy) {
        findings.push(
          this.makeFinding({
            id: 'iam-no-password-policy',
            title: 'No IAM password policy configured',
            description:
              'The AWS account does not have a custom password policy. Default password requirements may be insufficient.',
            severity: 'high',
            remediation:
              'Use iam:UpdateAccountPasswordPolicyCommand with MinimumPasswordLength set to 14, RequireSymbols, RequireNumbers, RequireUppercaseCharacters, RequireLowercaseCharacters all set to true, MaxPasswordAge set to 90, PasswordReusePrevention set to 24. Rollback by restoring previous password policy values.',
            passed: false,
            accountId,
          }),
        );
        return findings;
      }

      if (!policy.MinimumPasswordLength || policy.MinimumPasswordLength < 14) {
        findings.push(
          this.makeFinding({
            id: 'iam-weak-password-length',
            title: 'IAM password policy minimum length is below 14 characters',
            description: `Password policy requires only ${policy.MinimumPasswordLength || 'default'} characters. CIS recommends at least 14.`,
            severity: 'medium',
            remediation:
              'Use iam:UpdateAccountPasswordPolicyCommand with MinimumPasswordLength set to 14, RequireSymbols, RequireNumbers, RequireUppercaseCharacters, RequireLowercaseCharacters all set to true, MaxPasswordAge set to 90, PasswordReusePrevention set to 24. Rollback by restoring previous password policy values.',
            passed: false,
            accountId,
          }),
        );
      } else {
        findings.push(
          this.makeFinding({
            id: 'iam-password-length-ok',
            title: 'IAM password policy minimum length meets requirements',
            description: `Password policy requires ${policy.MinimumPasswordLength} characters (minimum 14).`,
            severity: 'info',
            passed: true,
            accountId,
          }),
        );
      }

      if (
        !policy.RequireUppercaseCharacters ||
        !policy.RequireLowercaseCharacters ||
        !policy.RequireNumbers ||
        !policy.RequireSymbols
      ) {
        findings.push(
          this.makeFinding({
            id: 'iam-weak-password-complexity',
            title: 'IAM password policy does not require all character types',
            description:
              'Password policy should require uppercase, lowercase, numbers, and symbols.',
            severity: 'medium',
            remediation:
              'Use iam:UpdateAccountPasswordPolicyCommand with MinimumPasswordLength set to 14, RequireSymbols, RequireNumbers, RequireUppercaseCharacters, RequireLowercaseCharacters all set to true, MaxPasswordAge set to 90, PasswordReusePrevention set to 24. Rollback by restoring previous password policy values.',
            passed: false,
            accountId,
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('NoSuchEntity')) {
        findings.push(
          this.makeFinding({
            id: 'iam-no-password-policy',
            title: 'No IAM password policy configured',
            description:
              'The AWS account does not have a custom password policy.',
            severity: 'high',
            remediation:
              'Use iam:UpdateAccountPasswordPolicyCommand with MinimumPasswordLength set to 14, RequireSymbols, RequireNumbers, RequireUppercaseCharacters, RequireLowercaseCharacters all set to true, MaxPasswordAge set to 90, PasswordReusePrevention set to 24. Rollback by restoring previous password policy values.',
            passed: false,
            accountId,
          }),
        );
      } else {
        throw error;
      }
    }

    return findings;
  }

  private async checkUsersWithoutMfa(
    iam: IAMClient,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const users = await this.listAllUsers(iam);

    for (const user of users) {
      if (!user.UserName) continue;

      const mfaResp = await iam.send(
        new ListMFADevicesCommand({ UserName: user.UserName }),
      );

      const hasMfa = mfaResp.MFADevices && mfaResp.MFADevices.length > 0;

      if (!hasMfa) {
        findings.push(
          this.makeFinding({
            id: `iam-no-mfa-${user.UserName}`,
            title: `IAM user "${user.UserName}" does not have MFA enabled`,
            description: `User ${user.UserName} has no MFA device configured, increasing account compromise risk.`,
            severity: 'high',
            resourceType: 'AwsIamUser',
            resourceId: user.Arn || user.UserName,
            remediation: `[MANUAL] Cannot be auto-fixed. MFA device registration requires physical access to the authentication device. Enable MFA via the IAM Console for each user.`,
            passed: false,
            accountId,
          }),
        );
      }
    }

    return findings;
  }

  private async checkStaleAccessKeys(
    iam: IAMClient,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];
    const users = await this.listAllUsers(iam);
    const now = Date.now();

    for (const user of users) {
      if (!user.UserName) continue;

      const keysResp = await iam.send(
        new ListAccessKeysCommand({ UserName: user.UserName }),
      );

      for (const key of keysResp.AccessKeyMetadata || []) {
        if (key.Status !== 'Active' || !key.CreateDate) continue;

        const ageDays = Math.floor(
          (now - key.CreateDate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (ageDays > STALE_KEY_DAYS) {
          findings.push(
            this.makeFinding({
              id: `iam-stale-key-${user.UserName}-${key.AccessKeyId}`,
              title: `IAM access key for "${user.UserName}" is ${ageDays} days old`,
              description: `Access key ${key.AccessKeyId} for user ${user.UserName} was created ${ageDays} days ago. Keys older than ${STALE_KEY_DAYS} days should be rotated.`,
              severity: ageDays > 180 ? 'high' : 'medium',
              resourceType: 'AwsIamAccessKey',
              resourceId: key.AccessKeyId || 'unknown',
              remediation: `Use iam:UpdateAccessKeyCommand with UserName, AccessKeyId, and Status set to 'Inactive' to deactivate the stale key. Rollback by setting Status to 'Active'.`,
              passed: false,
              accountId,
            }),
          );
        }
      }
    }

    return findings;
  }

  private async checkRootAccessKeys(
    iam: IAMClient,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const resp = await iam.send(new GetAccountSummaryCommand({}));
    const summary = resp.SummaryMap;

    if (!summary) return [];

    const rootKeys = summary['AccountAccessKeysPresent'];

    if (rootKeys && rootKeys > 0) {
      return [
        this.makeFinding({
          id: 'iam-root-access-keys',
          title: 'Root account has active access keys',
          description:
            'The root account has active access keys. Root access keys provide unrestricted access and should be removed.',
          severity: 'critical',
          resourceType: 'AwsAccount',
          resourceId: accountId || 'root',
          remediation:
            '[MANUAL] Cannot be auto-fixed. Root access keys must be deleted manually through the AWS Console root account security credentials page.',
          passed: false,
          accountId,
        }),
      ];
    }

    return [
      this.makeFinding({
        id: 'iam-root-access-keys',
        title: 'Root account has no active access keys',
        description: 'The root account does not have active access keys.',
        severity: 'info',
        passed: true,
        accountId,
      }),
    ];
  }

  private async listAllUsers(iam: IAMClient) {
    const users: Array<{
      UserName?: string;
      Arn?: string;
    }> = [];

    let marker: string | undefined;
    do {
      const resp = await iam.send(
        new ListUsersCommand({ Marker: marker, MaxItems: 100 }),
      );
      if (resp.Users) users.push(...resp.Users);
      marker = resp.IsTruncated ? resp.Marker : undefined;
    } while (marker);

    return users;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceType?: string;
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: opts.resourceType || 'AwsIamPolicy',
      resourceId: opts.resourceId || 'account-level',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        service: 'IAM',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}
