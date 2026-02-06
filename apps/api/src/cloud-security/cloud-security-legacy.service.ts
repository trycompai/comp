import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '@db';
import { Prisma } from '@prisma/client';
import {
  createCipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';
import { DescribeRegionsCommand, EC2Client } from '@aws-sdk/client-ec2';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  salt: string;
}

/** AWS region code to friendly name mapping */
const REGION_NAMES: Record<string, string> = {
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

@Injectable()
export class CloudSecurityLegacyService {
  private readonly logger = new Logger(CloudSecurityLegacyService.name);

  /**
   * Encrypt a string value using the same algorithm as the Next.js app.
   * Produces EncryptedData compatible with @/lib/encryption.
   */
  private encrypt(text: string): EncryptedData {
    const secretKey = process.env.SECRET_KEY;
    if (!secretKey) {
      throw new Error('SECRET_KEY environment variable is not set');
    }

    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const key = scryptSync(secretKey, salt, KEY_LENGTH, {
      N: 16384,
      r: 8,
      p: 1,
    });
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  /**
   * Connect a legacy cloud provider (creates Integration record).
   */
  async connectLegacy(
    organizationId: string,
    provider: 'aws' | 'gcp' | 'azure',
    credentials: Record<string, string | string[]>,
  ): Promise<{ integrationId: string }> {
    // Encrypt all credential fields
    const encryptedCredentials: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'string') {
        if (value.trim()) {
          encryptedCredentials[key] = this.encrypt(value);
        }
        continue;
      }
      if (Array.isArray(value)) {
        encryptedCredentials[key] = value
          .filter(Boolean)
          .map((item) => this.encrypt(item));
      }
    }

    // Extract display settings
    const connectionName =
      typeof credentials.connectionName === 'string'
        ? credentials.connectionName.trim()
        : undefined;
    const accountId =
      typeof credentials.accountId === 'string'
        ? credentials.accountId.trim()
        : undefined;
    const regionValues = Array.isArray(credentials.regions)
      ? credentials.regions
      : typeof credentials.region === 'string'
        ? [credentials.region]
        : [];

    const settings =
      provider === 'aws'
        ? { accountId, connectionName, regions: regionValues }
        : {};

    const integration = await db.integration.create({
      data: {
        name: connectionName || provider.toUpperCase(),
        integrationId: provider,
        organizationId,
        userSettings: encryptedCredentials as Prisma.JsonObject,
        settings: settings as Prisma.JsonObject,
      },
    });

    this.logger.log(
      `Created legacy integration ${integration.id} for ${provider}`,
    );
    return { integrationId: integration.id };
  }

  /**
   * Disconnect a legacy cloud provider (deletes Integration record).
   */
  async disconnectLegacy(
    integrationId: string,
    organizationId: string,
  ): Promise<void> {
    const integration = await db.integration.findFirst({
      where: { id: integrationId, organizationId },
    });

    if (!integration) {
      throw new NotFoundException('Cloud provider not found');
    }

    // Cascade deletes results
    await db.integration.delete({ where: { id: integration.id } });

    this.logger.log(`Deleted legacy integration ${integrationId}`);
  }

  /**
   * Validate AWS access key credentials (legacy flow using access key + secret).
   * Returns account ID and available regions.
   */
  async validateAwsAccessKeys(
    accessKeyId: string,
    secretAccessKey: string,
  ): Promise<{
    accountId: string;
    regions: Array<{ value: string; label: string }>;
  }> {
    if (!accessKeyId?.trim() || !secretAccessKey?.trim()) {
      throw new BadRequestException('Access key ID and secret are required');
    }

    const awsCredentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    };

    // Validate credentials via STS
    const stsClient = new STSClient({
      region: 'us-east-1',
      credentials: awsCredentials,
    });

    let accountIdentity: string;
    try {
      const identity = await stsClient.send(
        new GetCallerIdentityCommand({}),
      );
      accountIdentity = identity.Account || '';
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Failed to validate';
      throw new BadRequestException(`Invalid AWS credentials: ${msg}`);
    }

    // Get available regions
    const ec2Client = new EC2Client({
      region: 'us-east-1',
      credentials: awsCredentials,
    });

    let regions: Array<{ value: string; label: string }>;
    try {
      const resp = await ec2Client.send(new DescribeRegionsCommand({}));
      regions = (resp.Regions || [])
        .filter((r) => r.RegionName)
        .map((r) => {
          const code = r.RegionName!;
          const friendly = REGION_NAMES[code] || code;
          return { value: code, label: `${friendly} (${code})` };
        })
        .sort((a, b) => a.value.localeCompare(b.value));
    } catch {
      // Regions fetch failed — return empty (credentials still valid)
      regions = [];
    }

    return { accountId: accountIdentity, regions };
  }
}
