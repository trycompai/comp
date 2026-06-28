import {
  GetAccountPasswordPolicyCommand,
  GetAccountSummaryCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import { TASK_TEMPLATES } from '../../../task-mappings';
import type { CheckContext, IntegrationCheck } from '../../../types';
import {
  remediationForReadFailure,
  resolveAwsSessionOrFail,
  toReadFailure,
  type CheckOutcome,
  type ReadFailure,
  emitOutcomes,
} from './shared';

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

/** Password-policy findings only (independent of the account summary). */
export function evaluatePasswordPolicy(
  pp: IamAccountData['passwordPolicy'],
): CheckOutcome[] {
  const out: CheckOutcome[] = [];
  const id = 'account';

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
      evidence: { passwordPolicyConfigured: false },
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

  return out;
}

/** Root-account findings from the IAM account summary (MFA, access keys). */
export function evaluateAccountSummary(
  summary: Record<string, number>,
): CheckOutcome[] {
  const out: CheckOutcome[] = [];
  const id = 'account';

  if (summary.AccountMFAEnabled === 1) {
    out.push({
      kind: 'pass',
      title: 'Root account MFA enabled',
      description: 'The root account has MFA enabled.',
      resourceType: 'aws-account',
      resourceId: id,
      evidence: { accountMFAEnabled: true },
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
      evidence: { accountMFAEnabled: false },
    });
  }

  if ((summary.AccountAccessKeysPresent ?? 0) > 0) {
    out.push({
      kind: 'fail',
      title: 'Root account access keys present',
      description: 'The root account has access keys (active or inactive), which should not exist.',
      resourceType: 'aws-account',
      resourceId: id,
      severity: 'high',
      remediation: 'Delete root account access keys; use IAM users/roles instead.',
      evidence: {
        accountAccessKeysPresent: summary.AccountAccessKeysPresent ?? 0,
      },
    });
  } else {
    out.push({
      kind: 'pass',
      title: 'No root account access keys',
      description: 'The root account has no access keys.',
      resourceType: 'aws-account',
      resourceId: id,
      evidence: { accountAccessKeysPresent: 0 },
    });
  }

  return out;
}

/** Pure evaluation of IAM account-level posture (unit-tested without the SDK). */
export function evaluateIamAccount(data: IamAccountData): CheckOutcome[] {
  return [
    ...evaluatePasswordPolicy(data.passwordPolicy),
    ...evaluateAccountSummary(data.summary),
  ];
}

export const iamAccountSecurityCheck: IntegrationCheck = {
  id: 'aws-iam-account-security',
  name: 'IAM — password policy and root protections',
  description:
    'Verify a strong IAM password policy, root MFA enabled, and no root access keys.',
  service: 'iam-analyzer',
  taskMapping: TASK_TEMPLATES.rolebasedAccessControls,
  run: async (ctx: CheckContext) => {
    const session = await resolveAwsSessionOrFail(ctx);
    if (!session) {
      ctx.log('AWS IAM check: connection not configured — skipping');
      return;
    }
    const iam = new IAMClient({
      region: session.regions[0],
      credentials: session.credentials,
      // Reads are idempotent; extra attempts ride out transient network or
      // throttling failures during the scheduled-run herd.
      maxAttempts: 5,
    });

    let passwordPolicy: IamAccountData['passwordPolicy'] = null;
    let policyReadFailure: ReadFailure | undefined;
    try {
      const pp = await iam.send(new GetAccountPasswordPolicyCommand({}));
      passwordPolicy = pp.PasswordPolicy ?? null;
    } catch (err) {
      // No password policy set surfaces as NoSuchEntity(Exception); treat as
      // null (a genuine finding). Anything else (AccessDenied, throttling) is
      // indeterminate: do NOT rethrow (that would abort the whole check and
      // suppress the independent root-MFA/root-access-key findings below), and
      // do NOT evaluate null as "no policy" (a false finding) — surface
      // "could not verify" instead.
      if (!(err instanceof Error && /NoSuchEntity/i.test(err.name))) {
        policyReadFailure = toReadFailure(err);
        ctx.log(`IAM: could not read password policy: ${policyReadFailure.error}`);
      }
    }

    // Password policy and account summary are independent — emit the
    // password-policy findings now so they aren't lost if the summary read
    // fails below.
    if (policyReadFailure) {
      emitOutcomes(ctx, [
        {
          kind: 'fail',
          title: 'Could not verify IAM password policy',
          description: `The IAM account password policy could not be read (${policyReadFailure.error}), so password-policy strength is unverified.`,
          resourceType: 'aws-account',
          resourceId: 'account',
          severity: 'medium',
          remediation: remediationForReadFailure(
            policyReadFailure,
            'Grant iam:GetAccountPasswordPolicy to the integration role, then re-run the check.',
          ),
          evidence: { readError: policyReadFailure.error },
        },
      ]);
    } else {
      emitOutcomes(ctx, evaluatePasswordPolicy(passwordPolicy));
    }

    try {
      const summaryResp = await iam.send(new GetAccountSummaryCommand({}));
      const summary = (summaryResp.SummaryMap ?? {}) as Record<string, number>;
      emitOutcomes(ctx, evaluateAccountSummary(summary));
    } catch (err) {
      // The account summary drives the root-MFA / root-access-key findings — if
      // it can't be read, surface "could not verify" rather than aborting the
      // check with a bare error (or omitting those critical findings).
      const failure = toReadFailure(err);
      ctx.log(`IAM: could not read account summary: ${failure.error}`);
      emitOutcomes(ctx, [
        {
          kind: 'fail',
          title: 'Could not verify IAM account summary',
          description: `The IAM account summary (root MFA, root access keys) could not be read (${failure.error}), so root-account security is unverified.`,
          resourceType: 'aws-account',
          resourceId: 'account',
          severity: 'medium',
          remediation: remediationForReadFailure(
            failure,
            'Grant iam:GetAccountSummary to the integration role, then re-run the check.',
          ),
          evidence: { readError: failure.error },
        },
      ]);
    }
  },
};
