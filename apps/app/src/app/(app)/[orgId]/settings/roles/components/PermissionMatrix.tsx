'use client';

import {
  RadioGroup,
  RadioGroupItem,
  Switch,
  Text,
} from '@trycompai/design-system';
import { statement } from '@comp/auth';

/** Access toggles — binary on/off permissions shown as switches above the matrix */
const ACCESS_TOGGLES = [
  { key: 'app', label: 'App Access', description: 'Can access the main compliance dashboard. Without this, the user can only access the employee portal.' },
];

/** Obligation toggles — requirements the role must fulfill, separate from permissions */
const OBLIGATION_TOGGLES = [
  { key: 'compliance', label: 'Employee Compliance', description: 'Must complete compliance tasks: sign policies, watch training videos, and install device agent.' },
];

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
  trust: { label: 'Trust Center', description: 'Manage trust portal settings and access requests' },
  pentest: { label: 'Penetration Tests', description: 'Manage penetration testing activities' },
};

/** Resources grouped by product section for the permission matrix UI. */
const RESOURCE_SECTIONS: Array<{ label: string; keys: string[] }> = [
  {
    label: 'Compliance',
    keys: [
      'organization', 'member', 'control', 'evidence', 'policy', 'risk',
      'vendor', 'task', 'framework', 'audit', 'finding', 'questionnaire',
      'integration', 'apiKey', 'trust',
    ],
  },
  {
    label: 'Security',
    keys: ['pentest'],
  },
];

/**
 * Resources available for permission assignment — derived from @comp/auth statement.
 * Only includes resources that have a UI label (excludes internal ones like 'ac', 'team', 'app').
 */
const RESOURCES = Object.keys(RESOURCE_LABELS)
  .filter((key) => key in statement)
  .map((key) => ({ key, ...RESOURCE_LABELS[key] }));

/** Resources grouped into sections, filtered to only those present in the auth statement. */
const RESOURCE_SECTIONS_RESOLVED = RESOURCE_SECTIONS.map((section) => ({
  label: section.label,
  resources: section.keys
    .filter((key) => key in statement && key in RESOURCE_LABELS)
    .map((key) => ({ key, ...RESOURCE_LABELS[key] })),
})).filter((section) => section.resources.length > 0);

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
  obligations?: Record<string, boolean>;
  onObligationsChange?: (obligations: Record<string, boolean>) => void;
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

function AccessToggle({
  toggle,
  enabled,
  onToggle,
  disabled,
}: {
  toggle: { key: string; label: string; description: string };
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-3 border-b last:border-b-0">
      <div>
        <Text size="sm" weight="medium">
          {toggle.label}
        </Text>
        <Text size="xs" variant="muted">
          {toggle.description}
        </Text>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}

export function PermissionMatrix({ value, onChange, obligations, onObligationsChange, disabled = false }: PermissionMatrixProps) {
  const handleObligationChange = (key: string, enabled: boolean) => {
    if (!onObligationsChange) return;
    const newObligations = { ...obligations };
    if (enabled) {
      newObligations[key] = true;
    } else {
      delete newObligations[key];
    }
    onObligationsChange(newObligations);
  };

  const handleToggleChange = (resourceKey: string, enabled: boolean) => {
    const newPermissions = { ...value };
    if (enabled) {
      // app only has 'read', trust has 'read' and 'update'
      const actions = statement[resourceKey as keyof typeof statement];
      newPermissions[resourceKey] = actions ? [...actions] : ['read'];
    } else {
      delete newPermissions[resourceKey];
    }
    onChange(newPermissions);
  };

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

  const handleSetAllInSection = (sectionResources: Array<{ key: string }>, level: AccessLevel) => {
    if (disabled) return;
    const newPermissions = { ...value };
    for (const resource of sectionResources) {
      const permissions = accessLevelToPermissions(resource.key, level);
      if (permissions.length === 0) {
        delete newPermissions[resource.key];
      } else {
        newPermissions[resource.key] = permissions;
      }
    }
    onChange(newPermissions);
  };

  const getSectionAccessLevel = (sectionResources: Array<{ key: string }>): AccessLevel | 'mixed' => {
    if (sectionResources.length === 0) return 'none';
    const levels = sectionResources.map((r) => getAccessLevel(r.key, value[r.key] || []));
    const first = levels[0];
    return levels.every((l) => l === first) ? first : 'mixed';
  };

  return (
    <div className="space-y-4">
      {/* Access Toggles */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 py-2 px-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Access
          </span>
        </div>
        {ACCESS_TOGGLES.map((toggle) => (
          <AccessToggle
            key={toggle.key}
            toggle={toggle}
            enabled={Boolean(value[toggle.key]?.length)}
            onToggle={(enabled) => handleToggleChange(toggle.key, enabled)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Obligations */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 py-2 px-3">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Obligations
          </span>
        </div>
        {OBLIGATION_TOGGLES.map((toggle) => (
          <AccessToggle
            key={toggle.key}
            toggle={toggle}
            enabled={Boolean(obligations?.[toggle.key])}
            onToggle={(enabled) => handleObligationChange(toggle.key, enabled)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Resource Permissions Matrix */}
      {RESOURCE_SECTIONS_RESOLVED.map((section) => (
        <div key={section.label} className="rounded-md border">
          {/* Section + Column Header */}
          <div className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b bg-muted/50 py-2 px-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
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
          {/* Select All Row */}
          {section.resources.length > 1 && (() => {
            const sectionLevel = getSectionAccessLevel(section.resources);
            return (
              <RadioGroup
                value={sectionLevel === 'mixed' ? '' : sectionLevel}
                onValueChange={(newValue) =>
                  handleSetAllInSection(section.resources, newValue as AccessLevel)
                }
                disabled={disabled}
              >
                <div className="grid grid-cols-[1fr_100px_100px_100px] items-center border-b py-3 px-3 bg-muted/25">
                  <div>
                    <Text size="sm" weight="medium">
                      Select All
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
          })()}
          {/* Rows */}
          {section.resources.map((resource) => {
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
      ))}
    </div>
  );
}

// Export utilities for use in other components
export { RESOURCES, ACCESS_LEVEL_MAPPING, getAccessLevel, accessLevelToPermissions };
export type { ResourceKey, AccessLevel };
