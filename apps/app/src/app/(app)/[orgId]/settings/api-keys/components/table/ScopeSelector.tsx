'use client';

import { useAvailableScopes } from '@/hooks/use-api-keys';
import {
  type ScopePreset,
  groupScopesByResource,
  getReadOnlyScopes,
} from '../../lib/scope-presets';
import {
  Badge,
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronRight } from '@trycompai/design-system/icons';
import { useCallback, useEffect, useMemo } from 'react';

interface ScopeSelectorProps {
  preset: ScopePreset;
  onPresetChange: (preset: ScopePreset) => void;
  selectedScopes: string[];
  onScopesChange: (scopes: string[]) => void;
}

export function ScopeSelector({
  preset,
  onPresetChange,
  selectedScopes,
  onScopesChange,
}: ScopeSelectorProps) {
  const { availableScopes } = useAvailableScopes();

  const scopeGroups = useMemo(
    () => groupScopesByResource(availableScopes),
    [availableScopes],
  );

  // Sync scopes when preset changes
  useEffect(() => {
    if (preset === 'full') {
      onScopesChange([...availableScopes]);
    } else if (preset === 'read-only') {
      onScopesChange(getReadOnlyScopes(availableScopes));
    }
  }, [preset, availableScopes, onScopesChange]);

  const handlePresetClick = useCallback(
    (newPreset: ScopePreset) => {
      onPresetChange(newPreset);
    },
    [onPresetChange],
  );

  const toggleScope = useCallback(
    (scope: string) => {
      onPresetChange('custom');
      const next = selectedScopes.includes(scope)
        ? selectedScopes.filter((s) => s !== scope)
        : [...selectedScopes, scope];
      onScopesChange(next);
    },
    [selectedScopes, onScopesChange, onPresetChange],
  );

  const toggleResourceGroup = useCallback(
    (resourceScopes: string[]) => {
      onPresetChange('custom');
      const allSelected = resourceScopes.every((s) =>
        selectedScopes.includes(s),
      );
      if (allSelected) {
        onScopesChange(
          selectedScopes.filter((s) => !resourceScopes.includes(s)),
        );
      } else {
        const merged = new Set([...selectedScopes, ...resourceScopes]);
        onScopesChange(Array.from(merged));
      }
    },
    [selectedScopes, onScopesChange, onPresetChange],
  );

  return (
    <Stack gap="sm">
      <Text size="sm" weight="medium">
        Permissions
      </Text>

      {/* Preset buttons */}
      <div className="flex gap-2">
        <Button
          variant={preset === 'full' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick('full')}
        >
          Full Access
        </Button>
        <Button
          variant={preset === 'read-only' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick('read-only')}
        >
          Read Only
        </Button>
        <Button
          variant={preset === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handlePresetClick('custom')}
        >
          Custom
        </Button>
      </div>

      {/* Summary */}
      <Text size="xs" variant="muted">
        {selectedScopes.length} of {availableScopes.length} permissions selected
      </Text>

      {/* Scope groups */}
      {preset === 'custom' && (
        <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border p-2">
          {scopeGroups.map((group) => {
            const groupScopeValues = group.scopes.map((s) => s.scope);
            const allChecked = groupScopeValues.every((s) =>
              selectedScopes.includes(s),
            );
            const someChecked =
              !allChecked &&
              groupScopeValues.some((s) => selectedScopes.includes(s));

            return (
              <Collapsible key={group.resource}>
                <div className="flex items-center gap-2 py-1">
                  <Checkbox
                    checked={allChecked}
                    indeterminate={someChecked}
                    onCheckedChange={() =>
                      toggleResourceGroup(groupScopeValues)
                    }
                  />
                  <CollapsibleTrigger className="flex flex-1 items-center gap-1 text-sm font-medium [&>svg]:transition-transform data-[panel-open]:[&>svg]:rotate-90">
                    <ChevronRight size={14} />
                    {group.label}
                    <Badge variant="secondary">
                      {
                        groupScopeValues.filter((s) =>
                          selectedScopes.includes(s),
                        ).length
                      }
                      /{groupScopeValues.length}
                    </Badge>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1 pb-1">
                    {group.scopes.map((s) => (
                      <label
                        key={s.scope}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={selectedScopes.includes(s.scope)}
                          onCheckedChange={() => toggleScope(s.scope)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </Stack>
  );
}
