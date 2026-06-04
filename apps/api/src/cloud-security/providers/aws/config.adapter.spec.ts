import {
  DescribeConfigurationRecordersCommand,
  DescribeConfigurationRecorderStatusCommand,
  type ConfigurationRecorder,
} from '@aws-sdk/client-config-service';
import { ConfigAdapter } from './config.adapter';
import type { SecurityFinding } from '../../cloud-security.service';

type SendHandler = (command: unknown) => unknown;

function buildClient(handler: SendHandler) {
  return {
    send: jest.fn((command: unknown) => Promise.resolve(handler(command))),
  } as unknown as Parameters<
    ConfigAdapter['scan']
  >[0] extends infer _
    ? import('@aws-sdk/client-config-service').ConfigServiceClient
    : never;
}

/** Invoke the private checkRecorders() with a mocked Config client. */
function runCheckRecorders(args: {
  recorders: ConfigurationRecorder[];
  recording: boolean;
}): Promise<SecurityFinding[]> {
  const adapter = new ConfigAdapter();
  const handler: SendHandler = (command) => {
    if (command instanceof DescribeConfigurationRecordersCommand) {
      return { ConfigurationRecorders: args.recorders };
    }
    if (command instanceof DescribeConfigurationRecorderStatusCommand) {
      return {
        ConfigurationRecordersStatus: args.recorders.length
          ? [{ recording: args.recording }]
          : [],
      };
    }
    return {};
  };
  const client = buildClient(handler);
  const fn = (
    adapter as unknown as {
      checkRecorders: (
        c: unknown,
        region: string,
      ) => Promise<SecurityFinding[]>;
    }
  ).checkRecorders;
  return fn.call(adapter, client, 'us-east-1');
}

describe('ConfigAdapter — checkRecorders recording-model awareness', () => {
  it('passes a legacy recorder with recordingGroup.allSupported=true', async () => {
    const findings = await runCheckRecorders({
      recorders: [{ name: 'default', recordingGroup: { allSupported: true } }],
      recording: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBe(true);
    expect(findings[0].title).toBe('AWS Config recorder is active');
  });

  it('passes a new-model recorder using recordingStrategy ALL_SUPPORTED_RESOURCE_TYPES (regression: no longer false-flagged)', async () => {
    const findings = await runCheckRecorders({
      recorders: [
        {
          name: 'default',
          // New model: allSupported is false/absent; the strategy is the source of truth.
          recordingGroup: {
            allSupported: false,
            recordingStrategy: { useOnly: 'ALL_SUPPORTED_RESOURCE_TYPES' },
          },
        },
      ],
      recording: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBe(true);
    expect(findings[0].title).toBe('AWS Config recorder is active');
  });

  it('flags a recorder using the EXCLUSION_BY_RESOURCE_TYPES strategy (e.g. IAM excluded)', async () => {
    const findings = await runCheckRecorders({
      recorders: [
        {
          name: 'default',
          recordingGroup: {
            allSupported: false,
            recordingStrategy: { useOnly: 'EXCLUSION_BY_RESOURCE_TYPES' },
            exclusionByResourceTypes: {
              resourceTypes: [
                'AWS::IAM::User',
                'AWS::IAM::Role',
                'AWS::IAM::Group',
                'AWS::IAM::Policy',
              ],
            },
          },
        },
      ],
      recording: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].passed).toBeFalsy();
    expect(findings[0].title).toBe('AWS Config recorder not fully active');
    expect(findings[0].severity).toBe('high');
  });

  it('flags an INCLUSION_BY_RESOURCE_TYPES recorder (records only specific types)', async () => {
    const findings = await runCheckRecorders({
      recorders: [
        {
          name: 'default',
          recordingGroup: {
            allSupported: false,
            recordingStrategy: { useOnly: 'INCLUSION_BY_RESOURCE_TYPES' },
            resourceTypes: ['AWS::S3::Bucket'],
          },
        },
      ],
      recording: true,
    });
    expect(findings[0].passed).toBeFalsy();
    expect(findings[0].title).toBe('AWS Config recorder not fully active');
  });

  it('flags an all-supported recorder that is stopped', async () => {
    const findings = await runCheckRecorders({
      recorders: [{ name: 'default', recordingGroup: { allSupported: true } }],
      recording: false,
    });
    expect(findings[0].passed).toBeFalsy();
    expect(findings[0].description).toContain('not recording');
  });

  it('produces AWS-valid remediation guidance (clean recordingGroup, no conflicting fields)', async () => {
    const findings = await runCheckRecorders({
      recorders: [
        {
          name: 'default',
          recordingGroup: {
            allSupported: false,
            recordingStrategy: { useOnly: 'EXCLUSION_BY_RESOURCE_TYPES' },
            exclusionByResourceTypes: { resourceTypes: ['AWS::IAM::Role'] },
          },
        },
      ],
      recording: true,
    });
    const remediation = findings[0].remediation ?? '';
    expect(remediation).toContain('allSupported: true');
    expect(remediation).toContain('includeGlobalResourceTypes: true');
    expect(remediation).toContain('ValidationException');
    // Must instruct AGAINST mixing the conflicting fields.
    expect(remediation).toMatch(/Do NOT include recordingStrategy/);
  });

  it('flags a missing recorder with includeGlobalResourceTypes in the create guidance', async () => {
    const findings = await runCheckRecorders({
      recorders: [],
      recording: false,
    });
    expect(findings[0].title).toBe('AWS Config recorder not configured');
    expect(findings[0].remediation).toContain('includeGlobalResourceTypes');
  });
});
