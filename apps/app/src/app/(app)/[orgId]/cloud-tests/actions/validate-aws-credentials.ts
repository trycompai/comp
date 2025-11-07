'use server';

import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { z } from 'zod';
import { authActionClient } from '../../../../../actions/safe-action';

const validateAwsCredentialsSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
});

export const validateAwsCredentialsAction = authActionClient
  .inputSchema(validateAwsCredentialsSchema)
  .metadata({
    name: 'validate-aws-credentials',
    track: {
      event: 'validate-aws-credentials',
      channel: 'cloud-tests',
    },
  })
  .action(async ({ parsedInput: { accessKeyId, secretAccessKey } }) => {
    try {
      // First, validate credentials using STS
      const stsClient = new STSClient({
        region: 'us-east-1', // Default region for validation
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const identity = await stsClient.send(new GetCallerIdentityCommand({}));

      // Get available regions
      const ec2Client = new EC2Client({
        region: 'us-east-1',
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      const regionsResponse = await ec2Client.send(new DescribeRegionsCommand({}));

      // Map of common region codes to friendly names
      const regionNames: Record<string, string> = {
        'us-east-1': 'US East (N. Virginia)',
        'us-east-2': 'US East (Ohio)',
        'us-west-1': 'US West (N. California)',
        'us-west-2': 'US West (Oregon)',
        'eu-west-1': 'Europe (Ireland)',
        'eu-west-2': 'Europe (London)',
        'eu-west-3': 'Europe (Paris)',
        'eu-central-1': 'Europe (Frankfurt)',
        'eu-north-1': 'Europe (Stockholm)',
        'eu-south-1': 'Europe (Milan)',
        'ap-southeast-1': 'Asia Pacific (Singapore)',
        'ap-southeast-2': 'Asia Pacific (Sydney)',
        'ap-northeast-1': 'Asia Pacific (Tokyo)',
        'ap-northeast-2': 'Asia Pacific (Seoul)',
        'ap-northeast-3': 'Asia Pacific (Osaka)',
        'ap-south-1': 'Asia Pacific (Mumbai)',
        'ap-east-1': 'Asia Pacific (Hong Kong)',
        'ca-central-1': 'Canada (Central)',
        'sa-east-1': 'South America (São Paulo)',
        'me-south-1': 'Middle East (Bahrain)',
        'af-south-1': 'Africa (Cape Town)',
      };

      const regions = (regionsResponse.Regions || [])
        .filter((region) => region.RegionName)
        .map((region) => {
          const code = region.RegionName!;
          const friendlyName = regionNames[code] || code;
          return {
            value: code,
            label: `${friendlyName} (${code})`,
          };
        })
        .sort((a, b) => a.value.localeCompare(b.value));

      return {
        success: true,
        accountId: identity.Account,
        regions,
      };
    } catch (error) {
      console.error('AWS credential validation failed:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to validate AWS credentials. Please check your access key and secret.',
      };
    }
  });
