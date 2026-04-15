import {
  CloudWatchLogsClient,
  DescribeMetricFiltersCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  CloudWatchClient,
  DescribeAlarmsForMetricCommand,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudTrailClient,
  DescribeTrailsCommand,
} from '@aws-sdk/client-cloudtrail';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

interface CisCheck {
  id: string;
  name: string;
  keywords: string[];
}

const CIS_CHECKS: CisCheck[] = [
  {
    id: 'cis-4.3',
    name: 'Root account usage',
    keywords: ['Root', 'userIdentity.type'],
  },
  {
    id: 'cis-4.1',
    name: 'Unauthorized API calls',
    keywords: ['UnauthorizedAccess', 'AccessDenied'],
  },
  {
    id: 'cis-4.5',
    name: 'CloudTrail config changes',
    keywords: ['CreateTrail', 'DeleteTrail'],
  },
  {
    id: 'cis-4.4',
    name: 'IAM policy changes',
    keywords: ['CreatePolicy', 'DeletePolicy', 'AttachRolePolicy'],
  },
  {
    id: 'cis-4.6',
    name: 'Console auth failures',
    keywords: ['ConsoleLogin', 'Failed'],
  },
  {
    id: 'cis-4.7',
    name: 'CMK deletion/disabling',
    keywords: ['kms.amazonaws.com', 'DisableKey'],
  },
  {
    id: 'cis-4.8',
    name: 'S3 bucket policy changes',
    keywords: ['PutBucketPolicy', 'DeleteBucketPolicy'],
  },
  {
    id: 'cis-4.9',
    name: 'Security group changes',
    keywords: ['AuthorizeSecurityGroupIngress', 'RevokeSecurityGroupIngress'],
  },
  {
    id: 'cis-4.10',
    name: 'NACL changes',
    keywords: ['CreateNetworkAcl', 'DeleteNetworkAcl'],
  },
  {
    id: 'cis-4.11',
    name: 'Network gateway changes',
    keywords: ['CreateCustomerGateway', 'AttachInternetGateway'],
  },
  {
    id: 'cis-4.12',
    name: 'Route table changes',
    keywords: ['CreateRoute', 'DeleteRoute'],
  },
  {
    id: 'cis-4.13',
    name: 'VPC changes',
    keywords: ['CreateVpc', 'DeleteVpc'],
  },
  {
    id: 'cis-4.14',
    name: 'AWS Organizations changes',
    keywords: ['organizations.amazonaws.com'],
  },
];

export class CloudWatchAdapter implements AwsServiceAdapter {
  readonly serviceId = 'cloudwatch';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const logsClient = new CloudWatchLogsClient({ credentials, region });
    const cwClient = new CloudWatchClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    // Prerequisite: check if any CloudTrail trail has CloudWatch Logs integration
    try {
      const ctClient = new CloudTrailClient({ credentials, region });
      const trailsResp = await ctClient.send(new DescribeTrailsCommand({}));
      const trails = trailsResp.trailList ?? [];
      const hasCloudWatchIntegration = trails.some(
        (trail) => !!trail.CloudWatchLogsLogGroupArn,
      );

      if (!hasCloudWatchIntegration) {
        return [
          this.makeFinding({
            checkId: 'cloudwatch-no-cloudtrail-integration',
            title: 'CloudTrail not integrated with CloudWatch Logs',
            description:
              'No CloudTrail trail in this region is configured to send logs to CloudWatch Logs. CIS metric filter checks require CloudTrail-CloudWatch integration.',
            severity: 'high',
            remediation:
              'Use cloudtrail:UpdateTrailCommand with the trail Name and CloudWatchLogsLogGroupArn set to the target log group ARN, and CloudWatchLogsRoleArn set to an IAM role ARN that allows CloudTrail to write to CloudWatch Logs. Rollback by calling cloudtrail:UpdateTrailCommand with CloudWatchLogsLogGroupArn set to an empty string.',
            evidence: {
              trailCount: trails.length,
              trailsWithCloudWatch: 0,
            },
            passed: false,
          }),
        ];
      }
    } catch {
      // If prerequisite check fails (permissions), fall through to existing behavior
    }

    try {
      // Fetch all metric filters (limit to 1000)
      const allFilters = await this.fetchAllMetricFilters(logsClient);

      // Check each CIS control
      for (const check of CIS_CHECKS) {
        const matchingFilter = allFilters.find((filter) => {
          const pattern = filter.filterPattern ?? '';
          return check.keywords.every((keyword) => pattern.includes(keyword));
        });

        if (!matchingFilter) {
          findings.push(
            this.makeFinding({
              checkId: check.id,
              title: `${check.name} — metric filter missing`,
              description: `No CloudWatch metric filter found for CIS ${check.id} (${check.name}). A metric filter matching keywords [${check.keywords.join(', ')}] is required.`,
              severity: 'medium',
              remediation: `Step 1: Create a CloudWatch Logs metric filter using logs:PutMetricFilterCommand with logGroupName set to the CloudTrail log group, filterName set to "compai-cis-${check.id}-${check.name.toLowerCase().replace(/\s+/g, '-')}", filterPattern set to the required CIS pattern for ${check.name} matching keywords [${check.keywords.join(', ')}], and metricTransformations containing metricName, metricNamespace "CloudTrailMetrics", and metricValue "1". Step 2: Create an SNS topic using sns:CreateTopicCommand with Name "compai-cis-alerts" if one does not already exist. Step 3: Create a CloudWatch alarm using cloudwatch:PutMetricAlarmCommand with AlarmName "compai-cis-${check.id}-alarm", MetricName matching the filter metric, Namespace "CloudTrailMetrics", Statistic "Sum", Period 300, EvaluationPeriods 1, Threshold 1, ComparisonOperator "GreaterThanOrEqualToThreshold", and AlarmActions set to the SNS topic ARN. Rollback by deleting the alarm with cloudwatch:DeleteAlarmsCommand, deleting the metric filter with logs:DeleteMetricFilterCommand, and optionally deleting the SNS topic with sns:DeleteTopicCommand.`,
              evidence: { keywords: check.keywords, filterFound: false },
              passed: false,
            }),
          );
          continue;
        }

        // Check if an alarm exists for the metric
        const metricName =
          matchingFilter.metricTransformations?.[0]?.metricName;

        if (!metricName) {
          findings.push(
            this.makeFinding({
              checkId: check.id,
              title: `${check.name} — no metric transformation`,
              description: `Metric filter for CIS ${check.id} (${check.name}) exists but has no metric transformation configured.`,
              severity: 'medium',
              remediation: `Step 1: Update the existing metric filter using logs:PutMetricFilterCommand with logGroupName, filterName set to the existing filter name, filterPattern preserved, and metricTransformations containing metricName "compai-cis-${check.id}-metric", metricNamespace "CloudTrailMetrics", and metricValue "1". Step 2: Create an SNS topic using sns:CreateTopicCommand with Name "compai-cis-alerts" if one does not already exist. Step 3: Create a CloudWatch alarm using cloudwatch:PutMetricAlarmCommand with AlarmName "compai-cis-${check.id}-alarm", MetricName "compai-cis-${check.id}-metric", Namespace "CloudTrailMetrics", Statistic "Sum", Period 300, EvaluationPeriods 1, Threshold 1, ComparisonOperator "GreaterThanOrEqualToThreshold", and AlarmActions set to the SNS topic ARN. Rollback by deleting the alarm with cloudwatch:DeleteAlarmsCommand and removing the metric transformation by calling logs:PutMetricFilterCommand with the original filter settings.`,
              evidence: {
                filterName: matchingFilter.filterName,
                metricTransformations: null,
              },
              passed: false,
            }),
          );
          continue;
        }

        const hasAlarm = await this.checkAlarmExists(cwClient, metricName);

        if (!hasAlarm) {
          findings.push(
            this.makeFinding({
              checkId: check.id,
              title: `${check.name} — alarm missing`,
              description: `Metric filter for CIS ${check.id} (${check.name}) exists with metric "${metricName}", but no CloudWatch alarm is configured for it.`,
              severity: 'medium',
              remediation: `Step 1: Create an SNS topic using sns:CreateTopicCommand with Name "compai-cis-alerts" if one does not already exist. Step 2: Create a CloudWatch alarm using cloudwatch:PutMetricAlarmCommand with AlarmName "compai-cis-${check.id}-alarm", MetricName "${metricName}", Namespace "CloudTrailMetrics", Statistic "Sum", Period 300, EvaluationPeriods 1, Threshold 1, ComparisonOperator "GreaterThanOrEqualToThreshold", and AlarmActions set to the SNS topic ARN. Rollback by deleting the alarm with cloudwatch:DeleteAlarmsCommand and optionally deleting the SNS topic with sns:DeleteTopicCommand.`,
              evidence: {
                filterName: matchingFilter.filterName,
                metricName,
                alarmExists: false,
              },
              passed: false,
            }),
          );
        } else {
          // Both filter and alarm exist — pass
          findings.push(
            this.makeFinding({
              checkId: check.id,
              title: `${check.name} — monitoring configured`,
              description: `CIS ${check.id} (${check.name}) has both a metric filter and alarm configured.`,
              severity: 'info',
              evidence: {
                filterName: matchingFilter.filterName,
                metricName,
                alarmExists: true,
              },
              passed: true,
            }),
          );
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async fetchAllMetricFilters(client: CloudWatchLogsClient): Promise<
    {
      filterName?: string;
      filterPattern?: string;
      metricTransformations?: { metricName?: string }[];
    }[]
  > {
    const filters: {
      filterName?: string;
      filterPattern?: string;
      metricTransformations?: { metricName?: string }[];
    }[] = [];

    let nextToken: string | undefined;

    do {
      const resp = await client.send(
        new DescribeMetricFiltersCommand({ nextToken }),
      );

      for (const filter of resp.metricFilters ?? []) {
        filters.push({
          filterName: filter.filterName,
          filterPattern: filter.filterPattern,
          metricTransformations: filter.metricTransformations?.map((t) => ({
            metricName: t.metricName,
          })),
        });
      }

      nextToken = resp.nextToken;

      if (filters.length >= 1000) break;
    } while (nextToken);

    return filters;
  }

  private async checkAlarmExists(
    client: CloudWatchClient,
    metricName: string,
  ): Promise<boolean> {
    // Check common namespaces — customers may use any of these
    const namespaces = [
      'CloudTrailMetrics',
      'CompAI-CIS-Metrics',
      'CISBenchmark',
    ];
    try {
      for (const ns of namespaces) {
        const resp = await client.send(
          new DescribeAlarmsForMetricCommand({
            MetricName: metricName,
            Namespace: ns,
          }),
        );
        if ((resp.MetricAlarms ?? []).length > 0) return true;
      }
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return false;
      throw error;
    }
  }

  private makeFinding(params: {
    checkId: string;
    title: string;
    description: string;
    severity: SecurityFinding['severity'];
    remediation?: string;
    evidence?: Record<string, unknown>;
    passed?: boolean;
  }): SecurityFinding {
    const id = `cloudwatch-${params.checkId}-${params.title.toLowerCase().replace(/\s+/g, '-')}`;
    return {
      id,
      title: params.title,
      description: params.description,
      severity: params.severity,
      resourceType: 'AwsCloudWatchAlarm',
      resourceId: params.checkId,
      remediation: params.remediation,
      evidence: { ...params.evidence, findingKey: id },
      createdAt: new Date().toISOString(),
      passed: params.passed,
    };
  }
}
