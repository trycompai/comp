/**
 * AWS IAM Types
 */
export interface IAMUser {
  UserName: string;
  UserId: string;
  Arn: string;
  Path: string;
  CreateDate: string;
  PasswordLastUsed?: string;
  Tags?: Array<{ Key: string; Value: string }>;
}

export interface IAMUserDetail {
  UserName: string;
  UserId: string;
  Arn: string;
  CreateDate: string;
  PasswordLastUsed?: string;
  GroupList?: string[];
  AttachedManagedPolicies?: Array<{ PolicyName: string; PolicyArn: string }>;
  UserPolicyList?: Array<{ PolicyName: string }>;
  Tags?: Array<{ Key: string; Value: string }>;
}

export interface IAMRole {
  RoleName: string;
  RoleId: string;
  Arn: string;
  Path: string;
  CreateDate: string;
  AssumeRolePolicyDocument: string;
  Description?: string;
  MaxSessionDuration?: number;
  Tags?: Array<{ Key: string; Value: string }>;
}

export interface MFADevice {
  UserName: string;
  SerialNumber: string;
  EnableDate: string;
}

export interface AccessKeyMetadata {
  UserName: string;
  AccessKeyId: string;
  Status: 'Active' | 'Inactive';
  CreateDate: string;
}

export interface AccessKeyLastUsed {
  LastUsedDate?: string;
  ServiceName?: string;
  Region?: string;
}

/**
 * CloudTrail Types
 */
export interface CloudTrailEvent {
  EventId: string;
  EventName: string;
  EventTime: string;
  EventSource: string;
  Username?: string;
  Resources?: Array<{
    ResourceType: string;
    ResourceName: string;
  }>;
  CloudTrailEvent: string; // JSON string with full event details
}

export interface CloudTrailLookupResponse {
  Events?: CloudTrailEvent[];
  NextToken?: string;
}

/**
 * STS Types
 */
export interface AssumeRoleResponse {
  Credentials: {
    AccessKeyId: string;
    SecretAccessKey: string;
    SessionToken: string;
    Expiration: string;
  };
  AssumedRoleUser: {
    AssumedRoleId: string;
    Arn: string;
  };
}
