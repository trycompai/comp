'use client';

import {
  RadioGroup,
  RadioGroupItem,
  Text,
} from '@trycompai/design-system';
import { statement } from '@comp/auth';

/** UI labels for permission resources. Keys kept in display order. */
const RESOURCE_LABELS: Record<string, { label: string; description: string }> = {
  organization: { label: 'Organization', description: 'Manage organization settings' },
  member: { label: 'Members', description: 'Manage team members and roles' },
  control: { label: 'Controls', description: 'Manage security controls' },
  evidence: { label: 'Evidence', description: 'Manage compliance evidence' },
  policy: { label: 'Policies', description: 'Manage organizational policies' },
  risk: { label: 'Risks', description: 'Manage risk assessments' },
  vendor: { label: 'Vendors', description: 'Manage vendor relationships' },
  task: { label: 'Tasks', description: 'Manage compliance tasks' },
  framework: { label: 'Frameworks', description: 'Manage compliance frameworks' },
  audit: { label: 'Audits', description: 'Manage audit activities' },
  finding: { label: 'Findings', description: 'Manage audit findings' },
  questionnaire: { label: 'Questionnaires', description: 'Manage security questionnaires' },
  integration: { label: 'Integrations', description: 'Manage third-party integrations' },
  apiKey: { label: 'API Keys', description: 'Manage API keys for programmatic access' },
  trust: { label: 'Trust Center', description: 'Manage trust portal and access requests' },
};

/**
 * Resources available for permission assignment — derived from @comp/auth statement.
 * Only includes resources that have a UI label (excludes internal ones like 'ac', 'team', 'app').
 */
const RESOURCES = Object.keys(RESOURCE_LABELS)
  .filter((key) => key in statement)
  .map((key) => ({ key, ...RESOURCE_LABELS[key] }));

type ResourceKey = string;

/**
 * Access levels for the simplified permission model:
 * - none: No access to the resource
 * - view: Read-only access ('read')
 * - edit: Full access (all actions the resource supports)
 */
type AccessLevel = 'none' | 'view' | 'edit';

/**
 * Maps access levels to the actual permission actions for each resource.
 * Derived from the @comp/auth statement (single source of truth).
 * - view = ['read']
 * - edit = all actions the resource supports
 */
const ACCESS_LEVEL_MAPPING: Record<string, Record<Exclude<AccessLevel, 'none'>, string[]>> =
  Object.fromEntries(
    Object.entries(statement)
      .filter(([key]) => key in RESOURCE_LABELS)
      .map(([key, actions]) => [
        key,
        {
          view: ['read'],
          edit: [...actions],
        },
      ]),
  );

interface PermissionMatrixProps {
  value: Record<string, string[]>;
  onChange: (permissions: Record<string, string[]>) => void;
  disabled?: boolean;
}

/**
 * Determines the access level from the actual permissions array
 */
function getAccessLevel(resourceKey: ResourceKey, permissions: string[]): AccessLevel {
  if (!permissions || permissions.length === 0) {
    return 'none';
  }

  const editActions = ACCESS_LEVEL_MAPPING[resourceKey].edit;
  const viewActions = ACCESS_LEVEL_MAPPING[resourceKey].view;

  // Check if it has edit-level permissions (includes create, update, or delete)
  const hasEditPermissions = permissions.some(
    (p) => p === 'create' || p === 'update' || p === 'delete'
  );

  if (hasEditPermissions) {
    return 'edit';
  }

  // Check if it has at least read permission
  if (permissions.includes('read')) {
    return 'view';
  }

  return 'none';
}

/**
 * Converts access level to actual permission actions
 */
function accessLevelToPermissions(resourceKey: ResourceKey, level: AccessLevel): string[] {
  if (level === 'none') {
    return [];
  }
  return ACCESS_LEVEL_MAPPING[resourceKey][level];
}

function PermissionRow({
  resource,
  currentLevel,
  onAccessChange,
  disabled,
}: {
  resource: (typeof RESOURCES)[number];
  currentLevel: AccessLevel;
  onAccessChange: (level: AccessLevel) => void;
  disabled: boolean;
}) {
  return (
    <RadioGroup
      value={currentLevel}
      onValueChange={(newValue) => onAccessChange(newValue as AccessLevel)}
      disabled={disabled}
    >
      <div className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b last:border-b-0 py-3 px-3">
        <div>
          <Text size="sm" weight="medium">
            {resource.label}
          </Text>
          <Text size="xs" variant="muted">
            {resource.description}
          </Text>
        </div>
        <div className="flex justify-center">
          <RadioGroupItem value="none" />
        </div>
        <div className="flex justify-center">
          <RadioGroupItem value="view" />
        </div>
        <div className="flex justify-center">
          <RadioGroupItem value="edit" />
        </div>
      </div>
    </RadioGroup>
  );
}

export function PermissionMatrix({ value, onChange, disabled = false }: PermissionMatrixProps) {
  const handleAccessChange = (resourceKey: ResourceKey, level: AccessLevel) => {
    const newPermissions = { ...value };
    const permissions = accessLevelToPermissions(resourceKey, level);

    if (permissions.length === 0) {
      delete newPermissions[resourceKey];
    } else {
      newPermissions[resourceKey] = permissions;
    }

    onChange(newPermissions);
  };

  const handleSetAll = (level: AccessLevel) => {
    if (disabled) return;

    const newPermissions: Record<string, string[]> = {};
    for (const resource of RESOURCES) {
      const permissions = accessLevelToPermissions(resource.key, level);
      if (permissions.length > 0) {
        newPermissions[resource.key] = permissions;
      }
    }
    onChange(newPermissions);
  };

  // Determine if all resources have the same access level
  const getAllAccessLevel = (): AccessLevel | 'mixed' => {
    const levels = RESOURCES.map((r) => getAccessLevel(r.key, value[r.key] || []));
    const firstLevel = levels[0];
    return levels.every((l) => l === firstLevel) ? firstLevel : 'mixed';
  };

  const currentAllLevel = getAllAccessLevel();

  return (
    <div className="rounded-md border">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b bg-muted/50 py-2 px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Resource
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">
          No Access
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">
          Read
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center">
          Write
        </span>
      </div>
      {/* Set All Row */}
      <RadioGroup
        value={currentAllLevel === 'mixed' ? '' : currentAllLevel}
        onValueChange={(newValue) => handleSetAll(newValue as AccessLevel)}
        disabled={disabled}
      >
        <div className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b bg-muted/30 py-2 px-3">
          <Text size="xs" variant="muted">
            Select all
          </Text>
          <div className="flex justify-center">
            <RadioGroupItem value="none" />
          </div>
          <div className="flex justify-center">
            <RadioGroupItem value="view" />
          </div>
          <div className="flex justify-center">
            <RadioGroupItem value="edit" />
          </div>
        </div>
      </RadioGroup>
      {/* Rows */}
      {RESOURCES.map((resource) => {
        const currentLevel = getAccessLevel(
          resource.key,
          value[resource.key] || []
        );

        return (
          <PermissionRow
            key={resource.key}
            resource={resource}
            currentLevel={currentLevel}
            onAccessChange={(level) => handleAccessChange(resource.key, level)}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}

// Export utilities for use in other components
export { RESOURCES, ACCESS_LEVEL_MAPPING, getAccessLevel, accessLevelToPermissions };
export type { ResourceKey, AccessLevel };
