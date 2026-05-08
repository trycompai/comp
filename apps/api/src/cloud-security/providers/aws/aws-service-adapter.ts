import type { SecurityFinding } from '../../cloud-security.service';

export type AwsCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export interface AwsServiceAdapter {
  /** Must match the manifest service ID (e.g. 'security-hub', 'iam-analyzer') */
  readonly serviceId: string;
  /** true = scan once in primary region, false = scan per configured region */
  readonly isGlobal?: boolean;
  scan(params: {
    credentials: AwsCredentials;
    region: string;
    accountId?: string;
  }): Promise<SecurityFinding[]>;
}
