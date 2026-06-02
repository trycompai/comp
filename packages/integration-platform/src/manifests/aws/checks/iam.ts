import {
  GetAccountPasswordPolicyCommand,
  GetAccountSummaryCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import { assumeAwsSession, type CheckOutcome, emitOutcomes } from './shared';

export interface IamAccountData {
  /** null = no password policy configured */
  passwordPolicy: {
    MinimumPasswordLength?: number;
    RequireSymbols?: boolean;
    RequireNumbers?: boolean;
    RequireUppercaseCharacters?: boolean;
    RequireLowercaseCharacters?: boolean;
  } | null;
  /** GetAccountSummary SummaryMap (AccountMFAEnabled, AccountAccessKeysPresent) */
  summary: Record<string, number>;
}

/** Pure evaluation of IAM account-level posture (unit-tested without the SDK). */
export function evaluateIamAccount(data: IamAccountData): CheckOutcome[] {
  const out: CheckOutcome[] = [];
  const id = 'account';

  const pp = data.passwordPolicy;
  if (!pp) {
    out.push({
      kind: 'fail',
      title: 'No IAM password policy',
      description: 'The account has no IAM password policy configured.',
      resourceType: 'aws-account',
      resourceId: id,
      severity: 'high',
      remediation:
        'Set an IAM password policy (min length 14; require symbols, numbers, upper and lower case).',
    });
  } else {
    const weak: string[] = [];
    if ((pp.MinimumPasswordLength ?? 0) < 14) weak.push('min length < 14');
    if (!pp.RequireSymbols) weak.push('no symbols required');
    if (!pp.RequireNumbers) weak.push('no numbers required');
    if (!pp.RequireUppercaseCharacters) weak.push('no uppercase required');
    if (!pp.RequireLowercaseCharacters) weak.push('no lowercase required');
    if (weak.length > 0) {
      out.push({
        kind: 'fail',
        title: 'Weak IAM password policy',
        description: `IAM password policy is weak: ${weak.join(', ')}.`,
        resourceType: 'aws-account',
        resourceId: id,
        severity: 'medium',
        remediation:
          'Strengthen the IAM password policy: min length 14 and require symbols, numbers, upper and lower case.',
        evidence: { ...pp },
      });
    } else {
      out.push({
        kind: 'pass',
        title: 'Strong IAM password policy',
        description: 'IAM password policy meets complexity requirements.',
        resourceType: 'aws-account',
        resourceId: id,
        evidence: { ...pp },
      });
    }
  }

  if (data.summary.AccountMFAEnabled === 1) {
    out.push({
      kind: 'pass',
      title: 'Root account MFA enabled',
      description: 'The root account has MFA enabled.',
      resourceType: 'aws-account',
      resourceId: id,
    });
  } else {
    out.push({
      kind: 'fail',
      title: 'Root account MFA disabled',
      description: 'The root account does not have MFA enabled.',
      resourceType: 'aws-account',
      resourceId: id,
      severity: 'high',
      remediation: 'Enable MFA on the root account.',
    });
  }

  if ((data.summary.AccountAccessKeysPresent ?? 0) > 0) {
    out.push({
      kind: 'fail',
      title: 'Root account access keys present',
      description: 'The root account has access keys (active or inactive), which should not exist.',
      resourceType: 'aws-account',
      resourceId: id,
      severity: 'high',
      remediation: 'Delete root account access keys; use IAM users/roles instead.',
    });
  } else {
    out.push({
      kind: 'pass',
      title: 'No root account access keys',
      description: 'The root account has no access keys.',
      resourceType: 'aws-account',
      resourceId: id,
    });
  }

  return out;
}

export const iamAccountSecurityCheck: IntegrationCheck = {
  id: 'aws-iam-account-security',
  name: 'IAM — password policy and root protections',
  description:
    'Verify a strong IAM password policy, root MFA enabled, and no root access keys.',
  service: 'iam-analyzer',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  run: async (ctx: CheckContext) => {
    const session = await assumeAwsSession(ctx);
    if (!session) {
      ctx.log('AWS IAM check: connection not configured — skipping');
      return;
    }
    const iam = new IAMClient({
      region: session.regions[0],
      credentials: session.credentials,
    });

    let passwordPolicy: IamAccountData['passwordPolicy'] = null;
    try {
      const pp = await iam.send(new GetAccountPasswordPolicyCommand({}));
      passwordPolicy = pp.PasswordPolicy ?? null;
    } catch (err) {
      // NoSuchEntity = no policy set → treat as null (a finding). Re-throw others.
      if (!(err instanceof Error && err.name === 'NoSuchEntityException')) throw err;
    }

    const summaryResp = await iam.send(new GetAccountSummaryCommand({}));
    const summary = (summaryResp.SummaryMap ?? {}) as Record<string, number>;

    emitOutcomes(ctx, evaluateIamAccount({ passwordPolicy, summary }));
  },
};
