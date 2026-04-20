export interface PurgeSnapshot {
  organization: { id: string; name: string; slug: string };
  counts: Record<string, number>;
  stripe: {
    customerId: string | null;
    subscriptionId: string | null;
  };
  s3KeysFromSchema: string[];
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

export interface PurgeResult {
  success: true;
  organizationId: string;
  deletedCounts: Record<string, number>;
  externalCleanup: PurgeExternalCleanupResult;
}
