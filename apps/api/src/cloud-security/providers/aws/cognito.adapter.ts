import {
  CognitoIdentityProviderClient,
  ListUserPoolsCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

const MIN_PASSWORD_LENGTH = 14;

export class CognitoAdapter implements AwsServiceAdapter {
  readonly serviceId = 'cognito';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
    accountId,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new CognitoIdentityProviderClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const resp = await client.send(
          new ListUserPoolsCommand({
            MaxResults: 60,
            NextToken: nextToken,
          }),
        );

        for (const pool of resp.UserPools ?? []) {
          if (!pool.Id) continue;

          const poolFindings = await this.checkPool(
            client,
            pool.Id,
            pool.Name ?? pool.Id,
            region,
            accountId,
          );
          findings.push(...poolFindings);
        }

        nextToken = resp.NextToken;
      } while (nextToken);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async checkPool(
    client: CognitoIdentityProviderClient,
    poolId: string,
    poolName: string,
    region: string,
    accountId?: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    try {
      const resp = await client.send(
        new DescribeUserPoolCommand({ UserPoolId: poolId }),
      );

      const pool = resp.UserPool;
      if (!pool) return [];

      const resourceId = pool.Arn ?? poolId;

      // Check MFA configuration
      const mfaConfig = pool.MfaConfiguration;
      if (mfaConfig === 'OFF') {
        findings.push(
          this.makeFinding({
            id: `cognito-mfa-off-${poolId}`,
            title: `Cognito user pool "${poolName}" has MFA not enabled (${region})`,
            description: `User pool ${poolName} (${poolId}) has multi-factor authentication disabled. Users can sign in with only a password.`,
            severity: 'high',
            resourceId,
            remediation: `Use cognito-idp:SetUserPoolMfaConfigCommand with UserPoolId set to "${poolId}" and MfaConfiguration set to 'ON'. Configure SoftwareTokenMfaConfiguration.Enabled to true for TOTP, or SmsMfaConfiguration with SmsAuthenticationMessage and SmsConfiguration for SMS MFA. Rollback: use cognito-idp:SetUserPoolMfaConfigCommand with MfaConfiguration set to 'OFF'.`,
            passed: false,
            accountId,
            region,
          }),
        );
      } else if (mfaConfig === 'OPTIONAL') {
        findings.push(
          this.makeFinding({
            id: `cognito-mfa-optional-${poolId}`,
            title: `Cognito user pool "${poolName}" has MFA set to optional (${region})`,
            description: `User pool ${poolName} (${poolId}) has MFA configured as optional. Users can choose to skip MFA enrollment.`,
            severity: 'medium',
            resourceId,
            remediation: `Use cognito-idp:SetUserPoolMfaConfigCommand with UserPoolId set to "${poolId}" and MfaConfiguration set to 'ON' (enforced). Configure SoftwareTokenMfaConfiguration.Enabled to true. Rollback: use cognito-idp:SetUserPoolMfaConfigCommand with MfaConfiguration set to 'OPTIONAL'.`,
            passed: false,
            accountId,
            region,
          }),
        );
      }

      // Check password policy
      const minLength = pool.Policies?.PasswordPolicy?.MinimumLength ?? 0;
      if (minLength < MIN_PASSWORD_LENGTH) {
        findings.push(
          this.makeFinding({
            id: `cognito-weak-password-${poolId}`,
            title: `Cognito user pool "${poolName}" has weak password policy (${region})`,
            description: `User pool ${poolName} (${poolId}) requires a minimum password length of ${minLength} characters. The recommended minimum is ${MIN_PASSWORD_LENGTH} characters.`,
            severity: 'medium',
            resourceId,
            remediation: `Use cognito-idp:UpdateUserPoolCommand with UserPoolId set to "${poolId}" and Policies.PasswordPolicy.MinimumLength set to ${MIN_PASSWORD_LENGTH}. Also ensure RequireLowercase, RequireUppercase, RequireNumbers, and RequireSymbols are set to true. You must include all existing pool configuration to avoid resetting other settings. Rollback: use cognito-idp:UpdateUserPoolCommand with the previous MinimumLength value.`,
            passed: false,
            accountId,
            region,
          }),
        );
      }

      // Check advanced security mode
      const securityMode = pool.UserPoolAddOns?.AdvancedSecurityMode;
      if (securityMode !== 'ENFORCED') {
        findings.push(
          this.makeFinding({
            id: `cognito-no-advanced-security-${poolId}`,
            title: `Cognito user pool "${poolName}" does not have advanced security enforced (${region})`,
            description: `User pool ${poolName} (${poolId}) does not have advanced security mode set to ENFORCED. Adaptive authentication and compromised credential detection are not fully active.`,
            severity: 'low',
            resourceId,
            remediation: `Use cognito-idp:UpdateUserPoolCommand with UserPoolId set to "${poolId}" and UserPoolAddOns.AdvancedSecurityMode set to 'ENFORCED'. You must include all existing pool configuration to avoid resetting other settings. Rollback: use cognito-idp:UpdateUserPoolCommand with AdvancedSecurityMode set to 'AUDIT' or 'OFF'.`,
            passed: false,
            accountId,
            region,
          }),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private makeFinding(opts: {
    id: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    resourceId?: string;
    remediation?: string;
    passed: boolean;
    accountId?: string;
    region?: string;
  }): SecurityFinding {
    return {
      id: opts.id,
      title: opts.title,
      description: opts.description,
      severity: opts.severity,
      resourceType: 'AwsCognitoUserPool',
      resourceId: opts.resourceId || 'unknown',
      remediation: opts.remediation,
      evidence: {
        awsAccountId: opts.accountId,
        region: opts.region,
        service: 'Cognito',
        findingKey: opts.id,
      },
      createdAt: new Date().toISOString(),
      passed: opts.passed,
    };
  }
}
