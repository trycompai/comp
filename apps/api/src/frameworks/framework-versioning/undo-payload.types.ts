export interface UndoPayload {
  controls: EntityUndoBucket<ControlUndoContent>;
  policies: PolicyUndoBucket;
  tasks: EntityUndoBucket<TaskUndoContent>;
  requirementMaps: EdgeUndoBucket;
  // ControlDocumentType has no archivedAt column — hard-delete on remove,
  // recreate on rollback by (controlId, formType).
  controlDocumentTypes: ControlDocumentTypeUndoBucket;
  // Prisma implicit many-to-many relations: each entry is one connect or
  // disconnect between a Control and a Policy / Task instance.
  controlPolicyLinks: ImplicitEdgeBucket;
  controlTaskLinks: ImplicitEdgeBucket;
  // Framework-instance scoped equivalents for reusable controls. New syncs
  // write these; older sync operations may not have the buckets.
  frameworkControlPolicyLinks?: ImplicitEdgeBucket;
  frameworkControlTaskLinks?: ImplicitEdgeBucket;
  frameworkControlDocumentTypeLinks?: ImplicitEdgeBucket;
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

/**
 * ControlDocumentType rows are hard-deleted (no archivedAt column), so the
 * undo payload needs enough information to recreate them on rollback.
 */
export interface ControlDocumentTypeUndoBucket {
  /** IDs to hard-delete on rollback (rows this sync created). */
  created: string[];
  /** Rows this sync hard-deleted — recreate by (controlId, formType) on rollback. */
  deleted: Array<{ controlId: string; formType: string }>;
}

/**
 * Implicit Prisma M:N relation edges (e.g., `control.policies`, `control.tasks`).
 * Unlike explicit junction tables, these have no per-edge row with an archive
 * column — so the undo payload records the raw pairs we connected/disconnected.
 * Rollback reverses: `connected` become disconnects, `disconnected` become connects.
 */
export interface ImplicitEdgeBucket {
  connected: Array<{ controlId: string; otherId: string }>;
  disconnected: Array<{ controlId: string; otherId: string }>;
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
