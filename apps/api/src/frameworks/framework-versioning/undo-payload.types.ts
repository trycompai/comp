export interface UndoPayload {
  controls: EntityUndoBucket<ControlUndoContent>;
  policies: PolicyUndoBucket;
  tasks: EntityUndoBucket<TaskUndoContent>;
  requirementMaps: EdgeUndoBucket;
  controlDocumentTypes: EdgeUndoBucket;
}

export interface EntityUndoBucket<Content> {
  created: string[]; // IDs hard-deleted on rollback
  archived: Array<{ id: string; prevArchivedAt: Date | null }>;
  contentUpdated: Array<{ id: string; prevContent: Content }>;
}

export interface PolicyUndoBucket extends EntityUndoBucket<PolicyUndoContent> {
  // Drafts added via sync (unpublished PolicyVersion rows) — deleted on rollback.
  draftsAdded: Array<{ policyId: string; draftVersionId: string }>;
}

export interface ControlUndoContent {
  name: string;
  description: string;
}

export interface TaskUndoContent {
  title: string;
  description: string;
  frequency: string | null;
  department: string | null;
}

export interface PolicyUndoContent {
  name: string;
  description: string | null;
  content: unknown;
  frequency: string | null;
  department: string | null;
}

export interface EdgeUndoBucket {
  created: string[];
  archived: Array<{ id: string; prevArchivedAt: Date | null }>;
}

export interface SyncSummary {
  controlsAdded: number;
  controlsArchived: number;
  controlsUpdatedApplied: number;
  controlsUpdatedPreserved: number;
  policiesAdded: number;
  policiesArchived: number;
  policiesUpdatedApplied: number;
  policiesUpdatedPreserved: number;
  policiesDraftAdded: number;
  tasksAdded: number;
  tasksArchived: number;
  tasksUpdatedApplied: number;
  tasksUpdatedPreserved: number;
  requirementMapsAdded: number;
  requirementMapsArchived: number;
  controlDocumentTypesAdded: number;
  controlDocumentTypesArchived: number;
}
