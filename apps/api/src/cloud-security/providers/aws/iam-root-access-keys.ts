import {
  GenerateCredentialReportCommand,
  GetCredentialReportCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import type { SecurityFinding } from '../../cloud-security.service';

const REPORT_POLL_MAX_ATTEMPTS = 10;
const REPORT_POLL_DELAY_MS = 1000;
const ROOT_USER_MARKER = '<root_account>';

/**
 * Returns the `iam-root-access-keys` finding for the given AWS account.
 *
 * Uses the IAM Credential Report (GenerateCredentialReport + GetCredentialReport)
 * to read the `<root_account>` row's `access_key_1_active` / `access_key_2_active`
 * columns — the same source AWS Console's "Root user has no active access keys"
 * recommendation uses.
 *
 * Previously used GetAccountSummary's `AccountAccessKeysPresent`, which returns 1
 * if the root account has any keys — active OR inactive — producing a critical
 * false positive for accounts with only disabled root keys.
 */
export async function checkRootAccessKeys(opts: {
  iam: IAMClient;
  accountId?: string;
}): Promise<SecurityFinding[]> {
  const csv = await getCredentialReport({ iam: opts.iam });
  if (!csv) return [];

  const rootRow = findRootAccountRow(csv);
  if (!rootRow) return [];

  const hasActiveKey =
    rootRow.access_key_1_active === 'true' ||
    rootRow.access_key_2_active === 'true';

  if (hasActiveKey) {
    return [
      buildFinding({
        title: 'Root account has active access keys',
        description:
          'The root account has at least one active access key. Root access keys provide unrestricted access and should be removed.',
        severity: 'critical',
        accountId: opts.accountId,
        passed: false,
      }),
    ];
  }

  return [
    buildFinding({
      title: 'Root account has no active access keys',
      description: 'The root account does not have active access keys.',
      severity: 'info',
      accountId: opts.accountId,
      passed: true,
    }),
  ];
}

/**
 * Triggers credential-report generation and polls until the CSV is available or
 * the operation fails. Returns null when the report can't be retrieved — the
 * caller should treat that as "skip the check" rather than fail the scan.
 *
 * Exported for testing.
 */
export async function getCredentialReport(opts: {
  iam: IAMClient;
}): Promise<string | null> {
  try {
    await opts.iam.send(new GenerateCredentialReportCommand({}));
  } catch {
    // Non-fatal: a recent report may already exist; fall through to retrieval.
  }

  for (let attempt = 0; attempt < REPORT_POLL_MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await opts.iam.send(new GetCredentialReportCommand({}));
      if (resp.Content) {
        return Buffer.from(resp.Content).toString('utf-8');
      }
      return null;
    } catch (error) {
      const name = (error as { name?: string }).name;
      if (
        name === 'CredentialReportNotReadyException' ||
        name === 'CredentialReportNotPresentException'
      ) {
        await sleep(REPORT_POLL_DELAY_MS);
        continue;
      }
      return null;
    }
  }

  return null;
}

/**
 * Parses the credential-report CSV and returns the `<root_account>` row as a
 * map of column-name → value. Returns null if the CSV is malformed or has no
 * root row.
 *
 * Exported for testing.
 */
export function findRootAccountRow(
  csv: string,
): Record<string, string> | null {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;

  const header = lines[0].split(',');
  const rootLine = lines.find((line) =>
    line.startsWith(`${ROOT_USER_MARKER},`),
  );
  if (!rootLine) return null;

  const cols = rootLine.split(',');
  const row: Record<string, string> = {};
  for (let i = 0; i < header.length; i++) {
    row[header[i]] = cols[i] ?? '';
  }
  return row;
}

function buildFinding(opts: {
  title: string;
  description: string;
  severity: SecurityFinding['severity'];
  accountId?: string;
  passed: boolean;
}): SecurityFinding {
  return {
    id: 'iam-root-access-keys',
    title: opts.title,
    description: opts.description,
    severity: opts.severity,
    resourceType: 'AwsAccount',
    resourceId: opts.accountId || 'root',
    remediation: opts.passed
      ? undefined
      : '[MANUAL] Cannot be auto-fixed. Root access keys must be deleted manually through the AWS Console root account security credentials page.',
    evidence: {
      awsAccountId: opts.accountId,
      service: 'IAM',
      findingKey: 'iam-root-access-keys',
    },
    createdAt: new Date().toISOString(),
    passed: opts.passed,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
