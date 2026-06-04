import {
  ConfigServiceClient,
  type ConfigurationRecorder,
  DescribeConfigurationRecordersCommand,
  DescribeConfigurationRecorderStatusCommand,
  DescribeDeliveryChannelsCommand,
  DescribeDeliveryChannelStatusCommand,
} from '@aws-sdk/client-config-service';
import type { SecurityFinding } from '../../cloud-security.service';
import type { AwsCredentials, AwsServiceAdapter } from './aws-service-adapter';

export class ConfigAdapter implements AwsServiceAdapter {
  readonly serviceId = 'config';
  readonly isGlobal = false;

  async scan({
    credentials,
    region,
  }: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]> {
    const client = new ConfigServiceClient({ credentials, region });
    const findings: SecurityFinding[] = [];

    try {
      const [recorderResult, deliveryResult] = await Promise.allSettled([
        this.checkRecorders(client, region),
        this.checkDeliveryChannels(client, region),
      ]);

      if (recorderResult.status === 'fulfilled') {
        findings.push(...recorderResult.value);
      }
      if (deliveryResult.status === 'fulfilled') {
        findings.push(...deliveryResult.value);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('AccessDenied')) return [];
      throw error;
    }

    return findings;
  }

  private async checkRecorders(
    client: ConfigServiceClient,
    region: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const { ConfigurationRecorders } = await client.send(
      new DescribeConfigurationRecordersCommand({}),
    );

    if (!ConfigurationRecorders || ConfigurationRecorders.length === 0) {
      findings.push(
        this.makeFinding({
          id: `config-no-recorder-${region}`,
          title: 'AWS Config recorder not configured',
          description: `No AWS Config recorder found in ${region}.`,
          severity: 'high',
          resourceId: `arn:aws:config:${region}`,
          remediation:
            'Step 1: Create a service-linked role using iam:CreateServiceLinkedRoleCommand with AWSServiceName set to "config.amazonaws.com" (skip if the role already exists). Step 2: Create a configuration recorder using config-service:PutConfigurationRecorderCommand with ConfigurationRecorder containing name "compai-config-recorder", roleARN set to the Config service role ARN, and recordingGroup set to exactly { allSupported: true, includeGlobalResourceTypes: true }. Do NOT include recordingStrategy, exclusionByResourceTypes, or resourceTypes in recordingGroup — allSupported:true is mutually exclusive with those and AWS rejects the request with a ValidationException. Step 3: Create a delivery channel using config-service:PutDeliveryChannelCommand with DeliveryChannel containing name "compai-delivery-channel" and s3BucketName set to the target bucket. Step 4: Start the recorder using config-service:StartConfigurationRecorderCommand with ConfigurationRecorderName "compai-config-recorder". Rollback by calling config-service:StopConfigurationRecorderCommand with ConfigurationRecorderName "compai-config-recorder".',
        }),
      );
      return findings;
    }

    const { ConfigurationRecordersStatus } = await client.send(
      new DescribeConfigurationRecorderStatusCommand({}),
    );

    const status = ConfigurationRecordersStatus?.[0];
    const recorder = ConfigurationRecorders[0];
    const isRecording = status?.recording === true;
    const recordsAllSupported = this.recordsAllSupportedResources(recorder);

    if (isRecording && recordsAllSupported) {
      findings.push(
        this.makeFinding({
          id: `config-recorder-enabled-${region}`,
          title: 'AWS Config recorder is active',
          description: `AWS Config recorder in ${region} is recording all supported resources.`,
          severity: 'info',
          resourceId: recorder.name ?? `config-recorder-${region}`,
          passed: true,
        }),
      );
    } else {
      findings.push(
        this.makeFinding({
          id: `config-recorder-incomplete-${region}`,
          title: 'AWS Config recorder not fully active',
          description: `AWS Config recorder in ${region} is ${!isRecording ? 'not recording' : 'not recording all supported resources'}.`,
          severity: 'high',
          resourceId: recorder.name ?? `config-recorder-${region}`,
          remediation:
            'Step 1: Read the existing recorder with config-service:DescribeConfigurationRecordersCommand to get its exact name and roleARN. Step 2: Call config-service:PutConfigurationRecorderCommand with ConfigurationRecorder set to { name: <existing recorder name>, roleARN: <existing roleARN>, recordingGroup: { allSupported: true, includeGlobalResourceTypes: true } }. Do NOT include recordingStrategy, exclusionByResourceTypes, or resourceTypes in recordingGroup — allSupported:true is mutually exclusive with those and AWS rejects the request with a ValidationException. This overwrites any exclusion-based recording strategy so all supported resource types (including the global IAM resource types) are recorded. Step 3: Call config-service:StartConfigurationRecorderCommand with ConfigurationRecorderName set to the recorder name. Rollback by calling config-service:StopConfigurationRecorderCommand with ConfigurationRecorderName set to the recorder name.',
        }),
      );
    }

    return findings;
  }

  /**
   * Whether the recorder captures ALL supported resource types.
   *
   * AWS Config has two recording models:
   *  - Legacy: `recordingGroup.allSupported === true`.
   *  - Current ("Record all resource types with customizable overrides"):
   *    `recordingGroup.recordingStrategy.useOnly === 'ALL_SUPPORTED_RESOURCE_TYPES'`.
   *    On this model `allSupported` is typically false, so the legacy-only
   *    check produced false positives for recorders that DO record everything.
   *
   * A recorder using `EXCLUSION_BY_RESOURCE_TYPES` (records all-except) or
   * `INCLUSION_BY_RESOURCE_TYPES` (records only-listed) does NOT capture
   * every supported type, so it stays flagged for remediation.
   */
  private recordsAllSupportedResources(
    recorder: ConfigurationRecorder | undefined,
  ): boolean {
    const group = recorder?.recordingGroup;
    if (!group) return false;
    if (group.allSupported === true) return true;
    return group.recordingStrategy?.useOnly === 'ALL_SUPPORTED_RESOURCE_TYPES';
  }

  private async checkDeliveryChannels(
    client: ConfigServiceClient,
    region: string,
  ): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    const { DeliveryChannels } = await client.send(
      new DescribeDeliveryChannelsCommand({}),
    );

    if (!DeliveryChannels || DeliveryChannels.length === 0) {
      findings.push(
        this.makeFinding({
          id: `config-no-delivery-channel-${region}`,
          title: 'AWS Config delivery channel not configured',
          description: `No delivery channel found for AWS Config in ${region}.`,
          severity: 'medium',
          resourceId: `arn:aws:config:${region}`,
          remediation:
            'Use config-service:PutDeliveryChannelCommand with DeliveryChannel containing name "compai-delivery-channel" and s3BucketName set to the target logging bucket. Rollback by calling config-service:DeleteDeliveryChannelCommand with DeliveryChannelName "compai-delivery-channel". Note: the configuration recorder must be stopped before deleting a delivery channel.',
        }),
      );
      return findings;
    }

    const { DeliveryChannelsStatus } = await client.send(
      new DescribeDeliveryChannelStatusCommand({}),
    );

    const channel = DeliveryChannels[0];
    const hasS3 = !!channel?.s3BucketName;
    const statusOk = DeliveryChannelsStatus?.[0] !== undefined;

    if (hasS3 && statusOk) {
      findings.push(
        this.makeFinding({
          id: `config-delivery-channel-ok-${region}`,
          title: 'AWS Config delivery channel configured',
          description: `Delivery channel in ${region} is configured with S3 bucket ${channel.s3BucketName}.`,
          severity: 'info',
          resourceId: channel.name ?? `config-delivery-${region}`,
          passed: true,
        }),
      );
    } else {
      findings.push(
        this.makeFinding({
          id: `config-delivery-channel-issue-${region}`,
          title: 'AWS Config delivery channel misconfigured',
          description: `Delivery channel in ${region} is missing an S3 bucket configuration.`,
          severity: 'medium',
          resourceId: channel?.name ?? `config-delivery-${region}`,
          remediation:
            'Use config-service:PutDeliveryChannelCommand with DeliveryChannel containing the existing channel name and s3BucketName set to the target logging bucket. Rollback by calling config-service:PutDeliveryChannelCommand with the original delivery channel settings.',
        }),
      );
    }

    return findings;
  }

  private makeFinding(
    params: Omit<SecurityFinding, 'resourceType' | 'createdAt'> & {
      remediation?: string;
    },
  ): SecurityFinding {
    return {
      ...params,
      evidence: { ...(params.evidence ?? {}), findingKey: params.id },
      resourceType: 'AwsConfigRecorder',
      createdAt: new Date().toISOString(),
    };
  }
}
