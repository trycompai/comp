'use client';

import { Button, Label } from '@trycompai/design-system';
import { Input } from '@trycompai/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@trycompai/ui/select';
import { Loader2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

export type OAuthVariableRow = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  description?: string;
  currentValue?: string | number | boolean | string[];
  hasDynamicOptions?: boolean;
  options?: { value: string; label: string }[];
};

type Props = {
  variables: OAuthVariableRow[];
  variableValues: Record<string, string | number | boolean | string[]>;
  setVariableValues: Dispatch<
    SetStateAction<Record<string, string | number | boolean | string[]>>
  >;
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
      {variables.map((variable) => {
        const options = dynamicOptions[variable.id] ?? variable.options ?? [];
        return (
          <div key={variable.id} className="space-y-2">
            <Label htmlFor={variable.id}>
              {variable.label}
              {variable.required ? <span className="text-destructive ml-1">*</span> : null}
            </Label>
            {variable.description ? (
              <p className="text-xs text-muted-foreground">{variable.description}</p>
            ) : null}
            {variable.helpText ? (
              <p className="text-xs text-muted-foreground">{variable.helpText}</p>
            ) : null}

            {variable.type === 'boolean' ? (
              <Select
                value={String(variableValues[variable.id] ?? 'false')}
                onValueChange={(val) =>
                  setVariableValues((prev) => ({
                    ...prev,
                    [variable.id]: val === 'true',
                  }))
                }
              >
                <SelectTrigger id={variable.id}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            ) : variable.type === 'select' ? (
              <Select
                value={String(variableValues[variable.id] ?? '')}
                onValueChange={(val) =>
                  setVariableValues((prev) => ({ ...prev, [variable.id]: val }))
                }
                onOpenChange={(openSel) => {
                  if (openSel && variable.hasDynamicOptions && options.length === 0) {
                    void fetchOptions(variable.id);
                  }
                }}
              >
                <SelectTrigger id={variable.id}>
                  <SelectValue placeholder={`Select ${variable.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {loadingOptions[variable.id] ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading…
                    </div>
                  ) : options.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">No options</div>
                  ) : (
                    options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={variable.id}
                type={variable.type === 'number' ? 'number' : 'text'}
                value={String(variableValues[variable.id] ?? '')}
                onChange={(e) =>
                  setVariableValues((prev) => ({
                    ...prev,
                    [variable.id]:
                      variable.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))
                }
                placeholder={variable.placeholder}
              />
            )}
          </div>
        );
      })}
      <Button
        onClick={() => void onSave()}
        loading={savingVariables}
        disabled={savingVariables}
        size="sm"
      >
        Save configuration
      </Button>
    </div>
  );
}
