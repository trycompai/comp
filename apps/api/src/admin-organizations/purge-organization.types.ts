export type PurgeS3BucketRef =
  | 'orgAssets'
  | 'default'
  | 'knowledgeBase'
  | 'questionnaire';

export type PurgeS3KeysByBucket = Partial<Record<PurgeS3BucketRef, string[]>>;

export interface PurgeSnapshot {
  organization: { id: string; name: string; slug: string };
  counts: Record<string, number>;
  stripe: {
    customerId: string | null;
    subscriptionId: string | null;
  };
  s3KeysByBucket: PurgeS3KeysByBucket;
  knowledgeBaseDocumentIds: string[];
  manualAnswerIds: string[];
  integrations: { id: string; provider: string }[];
}

export interface PurgeExternalCleanupResult {
  stripe: { customerDeleted: boolean; subscriptionCanceled: boolean };
  s3: { objectsDeleted: number };
  vectorStore: {
    knowledgeBaseTasksTriggered: number;
    manualAnswerOrchestratorTriggered: boolean;
  };
}

export interface PurgeVerificationResult {
  verified: boolean;
  leftoverRows: Record<string, number>;
  s3Clean: boolean;
}

export interface PurgeResult {
  success: true;
  organizationId: string;
  deletedCounts: Record<string, number>;
  externalCleanup: PurgeExternalCleanupResult;
  verification: PurgeVerificationResult;
}
