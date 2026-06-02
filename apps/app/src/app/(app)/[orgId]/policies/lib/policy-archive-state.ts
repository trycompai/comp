interface PolicyArchiveState {
  archivedAt?: Date | string | null;
  isArchived?: boolean;
}

export function isArchivedPolicy(policy: PolicyArchiveState): boolean {
  return policy.isArchived === true || policy.archivedAt != null;
}
