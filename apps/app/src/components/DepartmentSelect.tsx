'use client';

import { Departments } from '@db';
import {
  Button,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@trycompai/design-system';
import { Add, Checkmark, Close } from '@trycompai/design-system/icons';
import { useEffect, useMemo, useRef, useState } from 'react';

const ADD_CUSTOM_VALUE = '__add_custom__';

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Custom departments to seed in the dropdown (e.g. values already saved on the org).
   * Built-in `Departments` enum values are always included.
   */
  customDepartments?: string[];
  className?: string;
}

const labelFor = (v: string) => v.toUpperCase();

/**
 * Single-select department picker. Users can pick a built-in `Departments`
 * value or click "Add custom..." to type a new department name. Custom values
 * added during the session remain available for re-selection in the dropdown.
 */
export function DepartmentSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Select department',
  customDepartments,
  className,
}: DepartmentSelectProps) {
  const [seen, setSeen] = useState<Set<string>>(
    () => new Set([value, ...(customDepartments ?? [])].filter(Boolean)),
  );

  useEffect(() => {
    setSeen((prev) => {
      let next: Set<string> | null = null;
      for (const v of [value, ...(customDepartments ?? [])]) {
        if (v && !prev.has(v)) {
          if (!next) next = new Set(prev);
          next.add(v);
        }
      }
      return next ?? prev;
    });
  }, [value, customDepartments]);

  const options = useMemo(() => {
    const map = new Map<string, string>();
    for (const dept of Object.values(Departments)) {
      map.set(dept, labelFor(dept));
    }
    for (const dept of seen) {
      if (!map.has(dept)) map.set(dept, labelFor(dept));
    }
    return Array.from(map, ([v, label]) => ({ value: v, label }));
  }, [seen]);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingCustom) inputRef.current?.focus();
  }, [isAddingCustom]);

  const handleSelectChange = (next: string | null) => {
    if (next === ADD_CUSTOM_VALUE) {
      setDraft('');
      setIsAddingCustom(true);
      return;
    }
    if (next && next !== value) onChange(next);
  };

  const handleSaveCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSeen((prev) => {
      if (prev.has(trimmed)) return prev;
      const next = new Set(prev);
      next.add(trimmed);
      return next;
    });
    if (trimmed !== value) onChange(trimmed);
    setIsAddingCustom(false);
    setDraft('');
  };

  const handleCancelCustom = () => {
    setIsAddingCustom(false);
    setDraft('');
  };

  if (isAddingCustom) {
    return (
      <div className={className}>
        <HStack gap="sm">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveCustom();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelCustom();
              }
            }}
            placeholder="Department name"
            disabled={disabled}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleSaveCustom}
            disabled={disabled || draft.trim().length === 0}
            aria-label="Save custom department"
          >
            <Checkmark size={16} />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleCancelCustom}
            disabled={disabled}
            aria-label="Cancel"
          >
            <Close size={16} />
          </Button>
        </HStack>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select value={value} onValueChange={v => handleSelectChange(v)} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>{labelFor(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_CUSTOM_VALUE}>
            <HStack gap="xs" align="center">
              <Add size={14} />
              Add custom...
            </HStack>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
