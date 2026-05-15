import {
  GenerateCredentialReportCommand,
  GetCredentialReportCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import {
  checkRootAccessKeys,
  findRootAccountRow,
  getCredentialReport,
} from './iam-root-access-keys';

const CREDENTIAL_REPORT_HEADER = [
  'user',
  'arn',
  'user_creation_time',
  'password_enabled',
  'password_last_used',
  'password_last_changed',
  'password_next_rotation',
  'mfa_active',
  'access_key_1_active',
  'access_key_1_last_rotated',
  'access_key_1_last_used_date',
  'access_key_1_last_used_region',
  'access_key_1_last_used_service',
  'access_key_2_active',
  'access_key_2_last_rotated',
  'access_key_2_last_used_date',
  'access_key_2_last_used_region',
  'access_key_2_last_used_service',
  'cert_1_active',
  'cert_1_last_rotated',
  'cert_2_active',
  'cert_2_last_rotated',
].join(',');

function buildRootRow(opts: {
  key1Active: boolean;
  key2Active: boolean;
}): string {
  // Column order matches CREDENTIAL_REPORT_HEADER.
  return [
    '<root_account>',
    'arn:aws:iam::123456789012:root',
    '2024-01-01T00:00:00+00:00',
    'not_supported',
    '2024-01-15T12:00:00+00:00',
    'not_supported',
    'not_supported',
    'true',
    opts.key1Active ? 'true' : 'false',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    opts.key2Active ? 'true' : 'false',
    'N/A',
    'N/A',
    'N/A',
    'N/A',
    'false',
    'N/A',
    'false',
    'N/A',
  ].join(',');
}

function buildCsv(opts: {
  rootKey1Active?: boolean;
  rootKey2Active?: boolean;
  includeRoot?: boolean;
  extraUserLines?: string[];
}): string {
  const lines = [CREDENTIAL_REPORT_HEADER];
  if (opts.includeRoot !== false) {
    lines.push(
      buildRootRow({
        key1Active: opts.rootKey1Active ?? false,
        key2Active: opts.rootKey2Active ?? false,
      }),
    );
  }
  if (opts.extraUserLines) lines.push(...opts.extraUserLines);
  return lines.join('\n');
}

type SendHandler = (command: unknown) => unknown;

function buildIam(handler: SendHandler): IAMClient {
  return {
    send: jest.fn((command: unknown) => {
      const result = handler(command);
      if (result instanceof Error) return Promise.reject(result);
      return Promise.resolve(result);
    }),
  } as unknown as IAMClient;
}

function buildIamReturningCsv(csv: string): IAMClient {
  return buildIam((command) => {
    if (command instanceof GenerateCredentialReportCommand) return {};
    if (command instanceof GetCredentialReportCommand) {
      return { Content: Buffer.from(csv, 'utf-8') };
    }
    return {};
  });
}

describe('findRootAccountRow', () => {
  it('returns null for an empty string', () => {
    expect(findRootAccountRow('')).toBeNull();
  });

  it('returns null for a header-only CSV', () => {
    expect(findRootAccountRow(CREDENTIAL_REPORT_HEADER)).toBeNull();
  });

  it('returns null when no <root_account> row is present', () => {
    const csv = buildCsv({
      includeRoot: false,
      extraUserLines: ['user1,arn:aws:iam::123:user/user1,N/A,true'],
    });
    expect(findRootAccountRow(csv)).toBeNull();
  });

  it('returns the parsed root row keyed by header column names', () => {
    const csv = buildCsv({ rootKey1Active: true, rootKey2Active: false });
    const row = findRootAccountRow(csv);
    expect(row).not.toBeNull();
    expect(row!.user).toBe('<root_account>');
    expect(row!.access_key_1_active).toBe('true');
    expect(row!.access_key_2_active).toBe('false');
  });
});

describe('checkRootAccessKeys', () => {
  it('passes when root has only an inactive access key (customer scenario)', async () => {
    // Customer reports zero active keys; AWS may still have an inactive one
    // attached. The old GetAccountSummary check flagged this as critical;
    // the new credential-report check correctly says "no active keys".
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: false, rootKey2Active: false }),
    );

    const findings = await checkRootAccessKeys({
      iam,
      accountId: '615477685532',
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe('iam-root-access-keys');
    expect(findings[0].passed).toBe(true);
    expect(findings[0].severity).toBe('info');
    expect(findings[0].title).toBe('Root account has no active access keys');
  });

  it('fails when root has access_key_1 active', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: true, rootKey2Active: false }),
    );

    const findings = await checkRootAccessKeys({
      iam,
      accountId: '615477685532',
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBe(false);
    expect(findings[0].severity).toBe('critical');
    expect(findings[0].title).toBe('Root account has active access keys');
    expect(findings[0].remediation).toContain('[MANUAL]');
  });

  it('fails when root has access_key_2 active', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: false, rootKey2Active: true }),
    );

    const findings = await checkRootAccessKeys({ iam });

    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBe(false);
    expect(findings[0].severity).toBe('critical');
  });

  it('fails when both root keys are active', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: true, rootKey2Active: true }),
    );

    const findings = await checkRootAccessKeys({ iam });

    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBe(false);
  });

  it('returns [] (skips check) when the credential report has no root row', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({
        includeRoot: false,
        extraUserLines: ['user1,arn:aws:iam::123:user/user1,N/A,true'],
      }),
    );

    const findings = await checkRootAccessKeys({ iam });

    expect(findings).toEqual([]);
  });

  it('returns [] when GetCredentialReport fails with a non-recoverable error', async () => {
    const iam = buildIam((command) => {
      if (command instanceof GenerateCredentialReportCommand) return {};
      if (command instanceof GetCredentialReportCommand) {
        return Object.assign(new Error('AccessDenied'), { name: 'AccessDenied' });
      }
      return {};
    });

    const findings = await checkRootAccessKeys({ iam });

    expect(findings).toEqual([]);
  });

  it('uses provided accountId in resourceId when present', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: true, rootKey2Active: false }),
    );

    const findings = await checkRootAccessKeys({
      iam,
      accountId: '999888777666',
    });

    expect(findings[0].resourceId).toBe('999888777666');
    expect(findings[0].evidence).toEqual({
      awsAccountId: '999888777666',
      service: 'IAM',
      findingKey: 'iam-root-access-keys',
    });
  });

  it('falls back to "root" resourceId when accountId is missing', async () => {
    const iam = buildIamReturningCsv(
      buildCsv({ rootKey1Active: true, rootKey2Active: false }),
    );

    const findings = await checkRootAccessKeys({ iam });

    expect(findings[0].resourceId).toBe('root');
  });
});

describe('getCredentialReport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the decoded CSV when the report is ready immediately', async () => {
    const csv = buildCsv({ rootKey1Active: false });
    const iam = buildIamReturningCsv(csv);

    const result = await getCredentialReport({ iam });

    expect(result).toBe(csv);
  });

  it('polls and succeeds after a CredentialReportNotReadyException', async () => {
    let getCalls = 0;
    const csv = buildCsv({ rootKey1Active: false });
    const iam = buildIam((command) => {
      if (command instanceof GenerateCredentialReportCommand) return {};
      if (command instanceof GetCredentialReportCommand) {
        getCalls += 1;
        if (getCalls === 1) {
          return Object.assign(new Error('not ready'), {
            name: 'CredentialReportNotReadyException',
          });
        }
        return { Content: Buffer.from(csv, 'utf-8') };
      }
      return {};
    });

    const promise = getCredentialReport({ iam });
    // Advance past the 1s retry delay so the second attempt runs.
    await jest.advanceTimersByTimeAsync(1500);
    const result = await promise;

    expect(result).toBe(csv);
    expect(getCalls).toBe(2);
  });

  it('returns null when the report is never ready within the retry budget', async () => {
    const iam = buildIam((command) => {
      if (command instanceof GenerateCredentialReportCommand) return {};
      if (command instanceof GetCredentialReportCommand) {
        return Object.assign(new Error('still generating'), {
          name: 'CredentialReportNotReadyException',
        });
      }
      return {};
    });

    const promise = getCredentialReport({ iam });
    // Advance past the full retry window (10 attempts × 1s).
    await jest.advanceTimersByTimeAsync(15000);
    const result = await promise;

    expect(result).toBeNull();
  });

  it('survives GenerateCredentialReport failing (e.g., already-in-progress)', async () => {
    const csv = buildCsv({ rootKey1Active: false });
    const iam = buildIam((command) => {
      if (command instanceof GenerateCredentialReportCommand) {
        return Object.assign(new Error('throttled'), { name: 'Throttling' });
      }
      if (command instanceof GetCredentialReportCommand) {
        return { Content: Buffer.from(csv, 'utf-8') };
      }
      return {};
    });

    const result = await getCredentialReport({ iam });

    expect(result).toBe(csv);
  });
});
