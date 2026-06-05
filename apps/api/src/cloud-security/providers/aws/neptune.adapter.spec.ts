const sendMock = jest.fn();

jest.mock('@aws-sdk/client-neptune', () => ({
  NeptuneClient: jest.fn().mockImplementation(() => ({ send: sendMock })),
  DescribeDBClustersCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

import { NeptuneAdapter } from './neptune.adapter';

const creds = {
  accessKeyId: 'a',
  secretAccessKey: 'b',
  sessionToken: 'c',
};

function run() {
  return new NeptuneAdapter().scan({ credentials: creds, region: 'us-east-1' });
}

describe('NeptuneAdapter', () => {
  beforeEach(() => sendMock.mockReset());

  it('flags a non-compliant Neptune cluster on all five checks', async () => {
    sendMock.mockResolvedValueOnce({
      DBClusters: [
        {
          Engine: 'neptune',
          DBClusterIdentifier: 'graph-1',
          DBClusterArn: 'arn:aws:rds:us-east-1:123:cluster:graph-1',
          StorageEncrypted: false,
          DeletionProtection: false,
          BackupRetentionPeriod: 1,
          IAMDatabaseAuthenticationEnabled: false,
          EnabledCloudwatchLogsExports: [],
        },
      ],
    });

    const findings = await run();
    const failed = findings.filter((f) => f.passed === false);
    expect(failed).toHaveLength(5);

    const titles = failed.map((f) => f.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        'Neptune cluster is not encrypted at rest',
        'Neptune cluster does not have deletion protection',
        'Neptune cluster has insufficient backup retention',
        'Neptune cluster does not enforce IAM database authentication',
        'Neptune cluster does not export audit logs to CloudWatch',
      ]),
    );

    // Encryption-at-rest is not auto-fixable; the others are.
    const enc = failed.find((f) => f.title.includes('not encrypted at rest'));
    expect(enc?.remediation).toContain('[MANUAL]');
    const del = failed.find((f) => f.title.includes('deletion protection'));
    expect(del?.remediation).toContain('neptune:ModifyDBClusterCommand');
    expect(del?.remediation).toContain('DeletionProtection set to true');
  });

  it('passes a fully-compliant Neptune cluster', async () => {
    sendMock.mockResolvedValueOnce({
      DBClusters: [
        {
          Engine: 'neptune',
          DBClusterIdentifier: 'graph-2',
          DBClusterArn: 'arn:aws:rds:us-east-1:123:cluster:graph-2',
          StorageEncrypted: true,
          DeletionProtection: true,
          BackupRetentionPeriod: 14,
          IAMDatabaseAuthenticationEnabled: true,
          EnabledCloudwatchLogsExports: ['audit'],
        },
      ],
    });

    const findings = await run();
    expect(findings).toHaveLength(5);
    expect(findings.every((f) => f.passed === true)).toBe(true);
  });

  it('ignores non-Neptune engine clusters', async () => {
    sendMock.mockResolvedValueOnce({
      DBClusters: [
        {
          Engine: 'aurora-postgresql',
          DBClusterIdentifier: 'pg-1',
          StorageEncrypted: false,
        },
      ],
    });

    expect(await run()).toEqual([]);
  });

  it('paginates through the Marker', async () => {
    sendMock
      .mockResolvedValueOnce({
        DBClusters: [
          {
            Engine: 'neptune',
            DBClusterIdentifier: 'graph-a',
            StorageEncrypted: true,
            DeletionProtection: true,
            BackupRetentionPeriod: 7,
            IAMDatabaseAuthenticationEnabled: true,
            EnabledCloudwatchLogsExports: ['audit'],
          },
        ],
        Marker: 'page-2',
      })
      .mockResolvedValueOnce({
        DBClusters: [
          {
            Engine: 'neptune',
            DBClusterIdentifier: 'graph-b',
            StorageEncrypted: true,
            DeletionProtection: true,
            BackupRetentionPeriod: 7,
            IAMDatabaseAuthenticationEnabled: true,
            EnabledCloudwatchLogsExports: ['audit'],
          },
        ],
      });

    const findings = await run();
    expect(sendMock).toHaveBeenCalledTimes(2);
    // 5 checks per cluster × 2 clusters.
    expect(findings).toHaveLength(10);
  });

  it('returns [] on AccessDenied', async () => {
    sendMock.mockRejectedValueOnce(new Error('AccessDeniedException: nope'));
    expect(await run()).toEqual([]);
  });
});
