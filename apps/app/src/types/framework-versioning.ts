export interface FrameworkUpdateStatus {
  currentVersion: { id: string; version: string } | null;
  latestVersion: {
    id: string;
    version: string;
    publishedAt: string;
    releaseNotes: string | null;
  } | null;
  updateAvailable: boolean;
}

export interface ManifestRequirement {
  id: string;
  identifier: string;
  name: string;
  description: string | null;
}

export interface ManifestControl {
  id: string;
  name: string;
  description: string;
  requirementIds: string[];
  policyIds: string[];
  taskIds: string[];
}

export interface ManifestPolicy {
  id: string;
  name: string;
  description: string | null;
  content: unknown;
  frequency: string | null;
  department: string | null;
}

export interface ManifestTask {
  id: string;
  name: string;
  description: string;
  frequency: string | null;
  department: string | null;
}

export interface InstanceControl {
  id: string;
  controlTemplateId: string | null;
  name: string;
  description: string;
}

export interface InstanceTask {
  id: string;
  taskTemplateId: string | null;
  title: string;
  description: string;
  frequency: string | null;
  department: string | null;
}

export interface InstancePolicy {
  id: string;
  policyTemplateId: string | null;
  name: string;
  description: string | null;
  content: unknown;
  frequency: string | null;
  department: string | null;
  status: string;
}

export interface UpdatePreview {
  fromVersion: { id: string; version: string };
  toVersion: { id: string; version: string };
  releaseNotes: string | null;
  controls: {
    added: ManifestControl[];
    archived: Array<{ instanceId: string; manifest: ManifestControl }>;
    updatedApplied: Array<{
      instance: InstanceControl;
      manifestFrom: ManifestControl;
      manifestTo: ManifestControl;
    }>;
    updatedPreserved: Array<{
      instance: InstanceControl;
      manifestFrom: ManifestControl;
      manifestTo: ManifestControl;
    }>;
  };
  tasks: {
    added: ManifestTask[];
    archived: Array<{ instanceId: string; manifest: ManifestTask }>;
    updatedApplied: Array<{
      instance: InstanceTask;
      manifestFrom: ManifestTask;
      manifestTo: ManifestTask;
    }>;
    updatedPreserved: Array<{
      instance: InstanceTask;
      manifestFrom: ManifestTask;
      manifestTo: ManifestTask;
    }>;
  };
  policies: {
    added: ManifestPolicy[];
    archived: Array<{ instanceId: string; manifest: ManifestPolicy }>;
    updatedApplied: Array<{
      instance: InstancePolicy;
      manifestFrom: ManifestPolicy;
      manifestTo: ManifestPolicy;
    }>;
    updatedPreserved: Array<{
      instance: InstancePolicy;
      manifestFrom: ManifestPolicy;
      manifestTo: ManifestPolicy;
    }>;
    draftAddedForPublished: Array<{
      instance: InstancePolicy;
      manifestTo: ManifestPolicy;
    }>;
  };
  requirements: {
    added: ManifestRequirement[];
    removed: ManifestRequirement[];
    updated: Array<{ from: ManifestRequirement; to: ManifestRequirement }>;
  };
  edges: {
    controlPolicy: {
      added: Array<{ controlName: string; policyName: string }>;
      removed: Array<{ controlName: string; policyName: string }>;
    };
    controlTask: {
      added: Array<{ controlName: string; taskName: string }>;
      removed: Array<{ controlName: string; taskName: string }>;
    };
    controlRequirement: {
      added: Array<{ controlName: string; requirementIdentifier: string; requirementName: string }>;
      removed: Array<{ controlName: string; requirementIdentifier: string; requirementName: string }>;
    };
    controlDocumentType: {
      added: Array<{ controlName: string; formType: string }>;
      removed: Array<{ controlName: string; formType: string }>;
    };
  };
}

export interface SyncHistoryItem {
  id: string;
  kind: 'SYNC' | 'ROLLBACK';
  performedAt: string;
  performedById: string | null;
  performedBy: {
    id: string;
    user: { id: string; name: string; email: string } | null;
  } | null;
  rollbackExpiresAt: string | null;
  rolledBackByOperationId: string | null;
  fromVersion: { id: string; version: string };
  toVersion: { id: string; version: string };
  summary: unknown;
}
