const mockTrailSend = jest.fn();
const mockLogsSend = jest.fn();
const mockCwSend = jest.fn();

jest.mock('@aws-sdk/client-cloudtrail', () => ({
  CloudTrailClient: jest.fn(() => ({ send: mockTrailSend })),
  DescribeTrailsCommand: jest.fn((input: unknown) => ({
    _cmd: 'DescribeTrails',
    input,
  })),
}));
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn(() => ({ send: mockLogsSend })),
  DescribeMetricFiltersCommand: jest.fn((input: unknown) => ({
    _cmd: 'DescribeMetricFilters',
    input,
  })),
}));
jest.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: jest.fn(() => ({ send: mockCwSend })),
  DescribeAlarmsForMetricCommand: jest.fn((input: unknown) => ({
    _cmd: 'DescribeAlarmsForMetric',
    input,
  })),
}));

import { CloudWatchAdapter, logGroupNameFromArn } from './cloudwatch.adapter';

const CREDS = {
  accessKeyId: 'AKIA',
  secretAccessKey: 'secret',
  sessionToken: 'token',
};

const scan = () =>
  new CloudWatchAdapter().scan({ credentials: CREDS, region: 'us-east-1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockCwSend.mockResolvedValue({ MetricAlarms: [] });
});

describe('logGroupNameFromArn', () => {
  it('derives the bare name and strips the trailing :*', () => {
    expect(
      logGroupNameFromArn(
        'arn:aws:logs:us-east-1:123456789012:log-group:aws-cloudtrail-logs-xyz:*',
      ),
    ).toBe('aws-cloudtrail-logs-xyz');
  });

  it('handles an ARN without a trailing :*', () => {
    expect(
      logGroupNameFromArn('arn:aws:logs:us-east-1:123:log-group:my-lg'),
    ).toBe('my-lg');
  });

  it('handles the GovCloud partition', () => {
    expect(
      logGroupNameFromArn(
        'arn:aws-us-gov:logs:us-gov-west-1:123:log-group:ct-logs:*',
      ),
    ).toBe('ct-logs');
  });

  it('returns null for a missing or malformed ARN', () => {
    expect(logGroupNameFromArn(undefined)).toBeNull();
    expect(logGroupNameFromArn('not-an-arn')).toBeNull();
  });
});

describe('CloudWatchAdapter — CloudTrail log group resolution', () => {
  it('injects the real log group name into the metric-filter-missing finding (the customer bug)', async () => {
    mockTrailSend.mockResolvedValue({
      trailList: [
        {
          Name: 'main',
          CloudWatchLogsLogGroupArn:
            'arn:aws:logs:us-east-1:123456789012:log-group:my-ct-logs:*',
        },
      ],
    });
    mockLogsSend.mockResolvedValue({ metricFilters: [] }); // nothing configured

    const findings = await scan();
    const missing = findings.find((f) =>
      f.title.includes('metric filter missing'),
    );

    expect(missing).toBeDefined();
    expect(missing!.evidence?.cloudWatchLogGroupName).toBe('my-ct-logs');
    expect(missing!.remediation).toContain('logGroupName set to "my-ct-logs"');
    // The old generic phrasing that forced the AI to guess must be gone.
    expect(missing!.remediation).not.toContain(
      'logGroupName set to the CloudTrail log group',
    );
  });

  it('uses the existing filter\'s own log group for the no-transformation update', async () => {
    mockTrailSend.mockResolvedValue({
      trailList: [
        {
          Name: 'main',
          CloudWatchLogsLogGroupArn:
            'arn:aws:logs:us-east-1:123:log-group:my-ct-logs:*',
        },
      ],
    });
    // A filter matching CIS 4.3 (Root account usage) keywords, but with no
    // metric transformation → "no metric transformation" finding.
    mockLogsSend.mockResolvedValue({
      metricFilters: [
        {
          filterName: 'root-filter',
          filterPattern: '{ $.userIdentity.type = "Root" }',
          logGroupName: 'existing-lg',
          metricTransformations: [],
        },
      ],
    });

    const findings = await scan();
    const noTransform = findings.find((f) =>
      f.title.includes('no metric transformation'),
    );

    expect(noTransform).toBeDefined();
    expect(noTransform!.evidence?.logGroupName).toBe('existing-lg');
    expect(noTransform!.remediation).toContain('logGroupName set to "existing-lg"');
  });

  it('returns the prerequisite finding when no trail integrates with CloudWatch Logs', async () => {
    mockTrailSend.mockResolvedValue({
      trailList: [{ Name: 'main' }], // no CloudWatchLogsLogGroupArn
    });

    const findings = await scan();
    expect(findings).toHaveLength(1);
    expect(findings[0].title).toMatch(/not integrated with CloudWatch Logs/i);
  });

  it('falls back to a generic instruction when DescribeTrails is denied', async () => {
    // DescribeTrails throws (e.g. missing cloudtrail:DescribeTrails) -> the log
    // group stays unknown, so the finding keeps the generic text rather than a
    // wrong name. (Not the customer's case, but must not crash or fabricate.)
    mockTrailSend.mockRejectedValue(new Error('AccessDenied'));
    mockLogsSend.mockResolvedValue({ metricFilters: [] });

    const findings = await scan();
    const missing = findings.find((f) =>
      f.title.includes('metric filter missing'),
    );
    expect(missing).toBeDefined();
    expect(missing!.evidence?.cloudWatchLogGroupName).toBeUndefined();
    expect(missing!.remediation).toContain("CloudWatch Logs log group");
  });
});
