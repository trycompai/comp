import { applyResolvedMetricFilterLogGroup } from './metric-filter-loggroup';
import type { AwsCommandStep } from './ai-remediation.prompt';

const putMetricFilterStep = (params: Record<string, unknown>): AwsCommandStep => ({
  service: 'cloudwatch-logs',
  command: 'PutMetricFilterCommand',
  params,
  purpose: 'create metric filter',
});

describe('applyResolvedMetricFilterLogGroup', () => {
  it('pins the trail log group from cloudWatchLogGroupName (missing-filter case)', () => {
    const steps = [putMetricFilterStep({ logGroupName: '', filterName: 'f' })];
    applyResolvedMetricFilterLogGroup(steps, {
      cloudWatchLogGroupName: 'my-ct-logs',
    });
    expect(steps[0].params.logGroupName).toBe('my-ct-logs');
  });

  it('uses the existing filter log group (update case) when cloudWatchLogGroupName is absent', () => {
    const steps = [putMetricFilterStep({ logGroupName: 'wrong', filterName: 'f' })];
    applyResolvedMetricFilterLogGroup(steps, { logGroupName: 'existing-lg' });
    expect(steps[0].params.logGroupName).toBe('existing-lg');
  });

  it('overwrites a wrong/placeholder value the AI produced', () => {
    const steps = [
      putMetricFilterStep({ logGroupName: 'CloudTrail/DefaultLogGroup' }),
    ];
    applyResolvedMetricFilterLogGroup(steps, {
      cloudWatchLogGroupName: 'real-lg',
    });
    expect(steps[0].params.logGroupName).toBe('real-lg');
  });

  it('only touches PutMetricFilter steps', () => {
    const other: AwsCommandStep = {
      service: 'sns',
      command: 'CreateTopicCommand',
      params: { Name: 'compai-cis-alerts' },
      purpose: 'create topic',
    };
    const steps = [other, putMetricFilterStep({ logGroupName: '' })];
    applyResolvedMetricFilterLogGroup(steps, {
      cloudWatchLogGroupName: 'my-ct-logs',
    });
    expect(steps[0].params).toEqual({ Name: 'compai-cis-alerts' }); // untouched
    expect(steps[1].params.logGroupName).toBe('my-ct-logs');
  });

  it('is a no-op when no log group was resolved (e.g. DescribeTrails denied)', () => {
    const steps = [putMetricFilterStep({ logGroupName: '' })];
    applyResolvedMetricFilterLogGroup(steps, { keywords: ['Root'] });
    expect(steps[0].params.logGroupName).toBe('');
  });
});
