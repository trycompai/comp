'use client';

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@trycompai/design-system';
import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import { ConnectionVariableMultiSelect } from './ConnectionVariableMultiSelect';

export interface ConnectionVariable {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  placeholder?: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select';
  required: boolean;
  default?: string | number | boolean | string[];
  options?: { value: string; label: string }[];
  hasDynamicOptions?: boolean;
}

export type VariableValue = string | number | boolean | string[];

export type ConnectionVariableSelectContentOptions = Pick<
  ComponentProps<typeof SelectContent>,
  'portal' | 'alignItemWithTrigger'
>;

interface ConnectionVariablesFieldsProps {
  variables: ConnectionVariable[];
  variableValues: Record<string, VariableValue>;
  setVariableValues: Dispatch<SetStateAction<Record<string, VariableValue>>>;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  loadingOptions: Record<string, boolean>;
  fetchOptions: (variableId: string) => void;
  selectContentOptions?: ConnectionVariableSelectContentOptions;
}

export const normalizeVariableValue = (
  variable: ConnectionVariable,
  value: unknown,
): VariableValue => {
  if (variable.type === 'multi-select') {
    return normalizeMultiSelectValue(value);
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return variable.default ?? '';
};

export const validateTargetRepos = (values: Record<string, VariableValue>): boolean => {
  const targetReposValue = values.target_repos;
  if (!Array.isArray(targetReposValue) || targetReposValue.length === 0) {
    return true;
  }

  for (const value of targetReposValue) {
    const stringValue = String(value ?? '').trim();
    if (!stringValue) {
      return false;
    }

    const colonIndex = stringValue.lastIndexOf(':');
    if (colonIndex === 0) {
      return false;
    }

    if (colonIndex > 0) {
      const repo = stringValue.substring(0, colonIndex).trim();
      if (!repo) {
        return false;
      }
    }
  }

  return true;
};

export function ConnectionVariablesFields({
  variables,
  variableValues,
  setVariableValues,
  dynamicOptions,
  loadingOptions,
  fetchOptions,
  selectContentOptions,
}: ConnectionVariablesFieldsProps) {
  const syncModeVariable = variables.find((variable) => variable.id === 'sync_user_filter_mode');
  const hasSyncModeVariable = Boolean(syncModeVariable);
  const rawSyncMode = variableValues.sync_user_filter_mode ?? syncModeVariable?.default ?? 'all';
  const effectiveSyncMode = String(rawSyncMode).toLowerCase();
  const hasSyncScopedFields =
    hasSyncModeVariable &&
    variables.some(
      (variable) =>
        variable.id === 'sync_excluded_emails' || variable.id === 'sync_included_emails',
    );

  const shouldShowVariable = (variable: ConnectionVariable): boolean => {
    if (variable.id === 'sync_excluded_emails' && hasSyncModeVariable) {
      return effectiveSyncMode === 'exclude';
    }

    if (variable.id === 'sync_included_emails' && hasSyncModeVariable) {
      return effectiveSyncMode === 'include';
    }

    return true;
  };

  return (
    <>
      {hasSyncScopedFields && effectiveSyncMode === 'all' && (
        <p className="text-xs text-muted-foreground">
          Employee sync is set to all users. Include and exclude fields are hidden because they are
          not used in this mode.
        </p>
      )}

      {variables.filter(shouldShowVariable).map((variable) => {
        const options = dynamicOptions[variable.id] || variable.options || [];
        const isLoadingOptions = loadingOptions[variable.id];

        return (
          <div key={variable.id} className="space-y-2">
            <Label htmlFor={variable.id}>
              {variable.label}
              {variable.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {variable.description && (
              <p className="text-xs text-muted-foreground">{variable.description}</p>
            )}
            {variable.helpText && (
              <p className="text-xs text-muted-foreground">{variable.helpText}</p>
            )}
            {variable.placeholder && !variable.description && !variable.helpText && (
              <p className="text-xs text-muted-foreground">Example: {variable.placeholder}</p>
            )}

            {variable.type === 'multi-select' ? (
              <ConnectionVariableMultiSelect
                variable={variable}
                options={options}
                isLoadingOptions={isLoadingOptions}
                value={variableValues[variable.id]}
                onChange={(value) =>
                  setVariableValues((prev) => ({
                    ...prev,
                    [variable.id]: value,
                  }))
                }
                onLoadOptions={() => fetchOptions(variable.id)}
              />
            ) : variable.type === 'select' ? (
              <Select
                value={String(variableValues[variable.id] ?? '')}
                onValueChange={(value) => {
                  if (value === null) return;
                  setVariableValues((prev) => ({ ...prev, [variable.id]: value }));
                }}
                onOpenChange={(isOpen) => {
                  if (isOpen && variable.hasDynamicOptions && !options.length) {
                    fetchOptions(variable.id);
                  }
                }}
              >
                <SelectTrigger id={variable.id}>
                  <SelectValue placeholder={`Select ${variable.label.toLowerCase()}`} />
                </SelectTrigger>
                {/*
                  The DS Select is built on @base-ui/react and portals its popup to document.body.
                  This form is rendered inside a Radix (@trycompai/ui) modal Dialog (ManageIntegrationDialog),
                  and Radix's modal sets `body { pointer-events: none }`. The portaled popup inherits that,
                  so its options are unclickable and the open is cancelled on mouseup ("insta-closes").
                  ManageIntegrationDialog passes portal={false} plus alignItemWithTrigger={false} so the
                  popup stays inside the dialog focus boundary and uses normal absolute anchored positioning.
                  pointer-events:auto keeps the popup interactive if a modal body lock is active. Harmless in
                  the design-system Sheet consumer (AccountSettingsSheet), which does not lock body events.
                */}
                <SelectContent {...selectContentOptions} style={{ pointerEvents: 'auto' }}>
                  {isLoadingOptions ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Spinner />
                      Loading options...
                    </div>
                  ) : options.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      No options available
                    </div>
                  ) : (
                    options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : variable.type === 'boolean' ? (
              <Select
                value={String(variableValues[variable.id] ?? variable.default ?? 'false')}
                onValueChange={(value) => {
                  if (value === null) return;
                  setVariableValues((prev) => ({
                    ...prev,
                    [variable.id]: value === 'true',
                  }));
                }}
              >
                <SelectTrigger id={variable.id}>
                  <SelectValue />
                </SelectTrigger>
                {/* pointer-events:auto so the popup is clickable inside the Radix modal's body lock (see note above). */}
                <SelectContent {...selectContentOptions} style={{ pointerEvents: 'auto' }}>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={variable.id}
                type={variable.type === 'number' ? 'number' : 'text'}
                value={String(variableValues[variable.id] ?? '')}
                onChange={(event) =>
                  setVariableValues((prev) => ({
                    ...prev,
                    [variable.id]:
                      variable.type === 'number' && event.target.value !== ''
                        ? Number(event.target.value)
                        : event.target.value,
                  }))
                }
                placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}`}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

const normalizeMultiSelectValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item).trim()).filter((item) => item.length > 0)),
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[\n,;]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    );
  }

  return [];
};
