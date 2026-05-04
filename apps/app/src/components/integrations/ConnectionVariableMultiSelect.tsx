'use client';

import { Input, Spinner } from '@trycompai/design-system';
import { Close } from '@trycompai/design-system/icons';
import MultipleSelector from '@trycompai/ui/multiple-selector';
import { useEffect, useRef } from 'react';
import type { ConnectionVariable, VariableValue } from './ConnectionVariablesForm';

interface ConnectionVariableMultiSelectProps {
  variable: ConnectionVariable;
  options: { value: string; label: string }[];
  isLoadingOptions: boolean;
  value: VariableValue | undefined;
  onChange: (value: string[]) => void;
  onLoadOptions: () => void;
}

export function ConnectionVariableMultiSelect({
  variable,
  options,
  isLoadingOptions,
  value,
  onChange,
  onLoadOptions,
}: ConnectionVariableMultiSelectProps) {
  const selectedValues = Array.isArray(value) ? value : [];
  const normalizedSelectedValues = selectedValues
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
  const hasLoadedRef = useRef(false);
  const isGitHubRepos = variable.id === 'target_repos';
  const parsedConfigs = isGitHubRepos ? normalizedSelectedValues.map(parseRepoBranch) : [];

  useEffect(() => {
    if (
      variable.hasDynamicOptions &&
      options.length === 0 &&
      !hasLoadedRef.current &&
      !isLoadingOptions
    ) {
      hasLoadedRef.current = true;
      onLoadOptions();
    }
  }, [variable.hasDynamicOptions, options.length, isLoadingOptions, onLoadOptions]);

  const handleRepoSelectionChange = (selectedRepos: string[]) => {
    if (!isGitHubRepos) {
      onChange(selectedRepos);
      return;
    }

    const newValues = selectedRepos
      .map((repo) => repo.trim())
      .filter(Boolean)
      .map((repo) => {
        const existing = parsedConfigs.find((config) => config.repo === repo);
        return formatRepoBranch({ repo, branch: existing?.branch || '' });
      });
    onChange(newValues);
  };

  const handleBranchChange = ({ repo, branch }: { repo: string; branch: string }) => {
    const newValues = normalizedSelectedValues.map((value) => {
      const parsed = parseRepoBranch(value);
      if (parsed.repo === repo) {
        return formatRepoBranch({ repo, branch });
      }
      return value;
    });
    onChange(newValues);
  };

  const handleRemoveRepo = (repo: string) => {
    const newValues = normalizedSelectedValues.filter(
      (value) => parseRepoBranch(value).repo !== repo,
    );
    onChange(newValues);
  };

  const reposForSelector = isGitHubRepos
    ? parsedConfigs.map((config) => config.repo)
    : normalizedSelectedValues;
  const isCreatable = isGitHubRepos || options.length === 0;

  return (
    <div className="space-y-3">
      <MultipleSelector
        value={reposForSelector.map((value) => ({
          value,
          label: options.find((option) => option.value === value)?.label || value,
        }))}
        onChange={(selected) => handleRepoSelectionChange(selected.map((item) => item.value))}
        defaultOptions={options.map((option) => ({ value: option.value, label: option.label }))}
        options={options.map((option) => ({ value: option.value, label: option.label }))}
        placeholder={variable.placeholder || `Select ${variable.label.toLowerCase()}...`}
        creatable={isCreatable}
        emptyIndicator={
          isLoadingOptions ? (
            <div className="flex items-center gap-2 py-2 px-3 text-sm text-muted-foreground">
              <Spinner />
              Loading options...
            </div>
          ) : isCreatable ? (
            <p className="text-center text-sm text-muted-foreground">
              Type a value and press Enter
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No options available</p>
          )
        }
      />

      {isGitHubRepos && parsedConfigs.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Optional: specify branches for each repository (comma-separated). Leave blank to use the
            default branch (main).
          </p>
          {parsedConfigs.map((config) => (
            <div key={config.repo} className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-secondary px-2 py-1 font-mono text-xs">
                {config.repo}
              </span>
              <span className="text-muted-foreground">:</span>
              <div className="min-w-0 flex-1">
                <Input
                  value={config.branch}
                  onChange={(event) =>
                    handleBranchChange({ repo: config.repo, branch: event.target.value })
                  }
                  placeholder="main, develop"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRepo(config.repo)}
                className="shrink-0 rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Close size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const parseRepoBranch = (value: unknown): { repo: string; branch: string } => {
  const stringValue = String(value ?? '');
  const cleanValue = stringValue.endsWith(':') ? stringValue.slice(0, -1) : stringValue;
  const colonIndex = cleanValue.lastIndexOf(':');

  if (colonIndex > 0 && colonIndex < cleanValue.length - 1) {
    return {
      repo: cleanValue.substring(0, colonIndex),
      branch: cleanValue.substring(colonIndex + 1),
    };
  }

  return { repo: cleanValue, branch: '' };
};

const formatRepoBranch = ({ repo, branch }: { repo: string; branch: string }): string => {
  const trimmedBranch = branch.trim();
  if (!trimmedBranch) {
    return repo;
  }

  return `${repo}:${trimmedBranch}`;
};
