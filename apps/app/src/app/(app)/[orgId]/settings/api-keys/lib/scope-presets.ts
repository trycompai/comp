export type ScopePreset = 'full' | 'read-only' | 'custom';

export const RESOURCE_LABELS: Record<string, string> = {
  organization: 'Organization',
  member: 'Members',
  invitation: 'Invitations',
  team: 'Teams',
  control: 'Controls',
  evidence: 'Evidence',
  policy: 'Policies',
  risk: 'Risks',
  vendor: 'Vendors',
  task: 'Tasks',
  framework: 'Frameworks',
  audit: 'Audit Logs',
  finding: 'Findings',
  questionnaire: 'Questionnaires',
  integration: 'Integrations',
  apiKey: 'API Keys',
};

export const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  assign: 'Assign',
  export: 'Export',
  upload: 'Upload',
  publish: 'Publish',
  approve: 'Approve',
  assess: 'Assess',
  complete: 'Complete',
  cancel: 'Cancel',
  respond: 'Respond',
};

export interface ScopeGroup {
  resource: string;
  label: string;
  scopes: { scope: string; action: string; label: string }[];
}

export function groupScopesByResource(scopes: string[]): ScopeGroup[] {
  const groups = new Map<string, ScopeGroup>();

  for (const scope of scopes) {
    const [resource, action] = scope.split(':');
    if (!resource || !action) continue;

    if (!groups.has(resource)) {
      groups.set(resource, {
        resource,
        label: RESOURCE_LABELS[resource] ?? resource,
        scopes: [],
      });
    }

    groups.get(resource)!.scopes.push({
      scope,
      action,
      label: ACTION_LABELS[action] ?? action,
    });
  }

  return Array.from(groups.values());
}

export function getReadOnlyScopes(allScopes: string[]): string[] {
  return allScopes.filter((s) => s.endsWith(':read'));
}
