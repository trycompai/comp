'use client';

import type { CredentialField } from '@/hooks/use-integration-platform';
import { ComboboxDropdown } from '@trycompai/ui/combobox-dropdown';
import MultipleSelector from '@trycompai/ui/multiple-selector';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@trycompai/design-system';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function CredentialInput({
  field,
  value,
  onChange,
}: {
  field: CredentialField;
  value: string | string[];
  onChange: (value: string | string[]) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(e.target.value);
  const stringValue = typeof value === 'string' ? value : '';

  if (field.type === 'password') {
    return (
      <div className="relative">
        <div className="[&_input]:pr-10">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={stringValue}
            onChange={handleChange}
            placeholder={field.placeholder}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={stringValue}
        onChange={handleChange}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select value={stringValue} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger>
          <SelectValue placeholder={field.placeholder || 'Select...'} />
        </SelectTrigger>
        <SelectContent>
          {field.options?.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'combobox') {
    const items =
      field.options?.map((opt) => ({
        id: opt.value,
        label: opt.label,
      })) || [];

    const selectedItem = stringValue
      ? (items.find((item) => item.id === stringValue) ?? { id: stringValue, label: stringValue })
      : undefined;

    return (
      <ComboboxDropdown
        items={items}
        selectedItem={selectedItem}
        onSelect={(item) => onChange(item.id)}
        onCreate={(customValue) => onChange(customValue)}
        placeholder={field.placeholder || 'Select or type...'}
        searchPlaceholder="Search or type custom value..."
        renderOnCreate={(customValue) => (
          <div className="flex items-center gap-2">
            <span className="text-sm">Use custom value:</span>
            <span className="font-medium">{customValue}</span>
          </div>
        )}
      />
    );
  }

  if (field.type === 'multi-select') {
    const selectedValues = Array.isArray(value) ? value : [];
    const options = field.options ?? [];

    return (
      <MultipleSelector
        value={selectedValues.map((val) => ({
          value: val,
          label: options.find((opt) => opt.value === val)?.label || val,
        }))}
        onChange={(selected) => onChange(selected.map((item) => item.value))}
        defaultOptions={options.map((opt) => ({ value: opt.value, label: opt.label }))}
        options={options.map((opt) => ({ value: opt.value, label: opt.label }))}
        placeholder={field.placeholder || 'Select...'}
        creatable={options.length === 0}
        emptyIndicator={<p className="text-center text-sm text-muted-foreground">No options</p>}
      />
    );
  }

  const inputType = field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text';
  const placeholder = field.type === 'url' ? field.placeholder || 'https://...' : field.placeholder;

  return (
    <div className="[&_input]:h-10">
      <Input type={inputType} value={stringValue} onChange={handleChange} placeholder={placeholder} />
    </div>
  );
}
