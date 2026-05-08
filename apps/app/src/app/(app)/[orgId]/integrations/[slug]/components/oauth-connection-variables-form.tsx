'use client';

import {
  ConnectionVariablesFields,
  validateTargetRepos,
  type ConnectionVariable,
} from '@/components/integrations/ConnectionVariablesForm';
import { Button } from '@trycompai/design-system';
import type { Dispatch, SetStateAction } from 'react';

export type OAuthVariableRow = ConnectionVariable & {
  currentValue?: string | number | boolean | string[];
};

type Props = {
  variables: OAuthVariableRow[];
  variableValues: Record<string, string | number | boolean | string[]>;
  setVariableValues: Dispatch<SetStateAction<Record<string, string | number | boolean | string[]>>>;
  dynamicOptions: Record<string, { value: string; label: string }[]>;
  loadingOptions: Record<string, boolean>;
  fetchOptions: (variableId: string) => void;
  onSave: () => void;
  savingVariables: boolean;
};

export function OAuthConnectionVariablesForm({
  variables,
  variableValues,
  setVariableValues,
  dynamicOptions,
  loadingOptions,
  fetchOptions,
  onSave,
  savingVariables,
}: Props) {
  const isTargetReposValid = validateTargetRepos(variableValues);

  if (variables.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No extra settings for this connection. You can disconnect below if needed.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Configuration
      </p>
      <ConnectionVariablesFields
        variables={variables}
        variableValues={variableValues}
        setVariableValues={setVariableValues}
        dynamicOptions={dynamicOptions}
        loadingOptions={loadingOptions}
        fetchOptions={fetchOptions}
      />
      <Button
        onClick={() => void onSave()}
        loading={savingVariables}
        disabled={savingVariables || !isTargetReposValid}
        size="sm"
      >
        Save configuration
      </Button>
    </div>
  );
}
