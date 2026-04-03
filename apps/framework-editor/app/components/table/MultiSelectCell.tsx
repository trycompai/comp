'use client';

import { Button } from '@trycompai/ui';
import { Check, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
  category?: string;
}

interface MultiSelectCellProps {
  values: string[];
  options: MultiSelectOption[];
  rowId: string;
  onUpdate: (rowId: string, values: string[]) => void;
  label: string;
  labelPlural: string;
}

export function MultiSelectCell({
  values,
  options,
  rowId,
  onUpdate,
  label,
  labelPlural,
}: MultiSelectCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setSearch('');
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  const selectedOptions = useMemo(
    () => options.filter((opt) => values.includes(opt.value)),
    [options, values],
  );

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.category?.toLowerCase().includes(lower),
    );
  }, [options, search]);

  const handleToggle = (value: string) => {
    const next = values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
    onUpdate(rowId, next);
  };

  const handleRemove = (value: string) => {
    onUpdate(rowId, values.filter((v) => v !== value));
  };

  if (!isExpanded) {
    return (
      <div
        className="hover:bg-muted/50 flex h-full cursor-pointer items-center px-2 py-1.5"
        onClick={() => setIsExpanded(true)}
      >
        {values.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">None</span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {values.length} {values.length === 1 ? label.toLowerCase() : labelPlural.toLowerCase()}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-popover border-border absolute left-0 top-0 z-50 min-w-[300px] rounded-xs border shadow-lg"
      ref={containerRef}
    >
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Linked {labelPlural}</span>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setSearch('');
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {selectedOptions.length > 0 && (
        <div className="max-h-36 overflow-auto p-2">
          <div className="space-y-1">
            {selectedOptions.map((opt) => (
              <div
                key={opt.value}
                className="bg-muted/50 group flex items-center justify-between rounded-xs px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{opt.label}</div>
                  {opt.category && (
                    <div className="text-muted-foreground truncate text-xs">{opt.category}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(opt.value)}
                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOptions.length === 0 && (
        <div className="text-muted-foreground py-2 text-center text-sm italic">
          No {labelPlural.toLowerCase()} linked
        </div>
      )}

      <div className="border-border border-t p-2">
        <input
          type="text"
          placeholder={`Search ${labelPlural.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-border bg-background mb-2 w-full rounded-xs border px-2 py-1.5 text-sm outline-none focus:border-primary"
          autoFocus
        />
        <div className="max-h-36 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="text-muted-foreground py-2 text-center text-sm">
              {search ? 'No matches' : 'No options'}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`hover:bg-muted flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-left text-sm ${
                    isSelected ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => handleToggle(opt.value)}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{opt.label}</div>
                    {opt.category && (
                      <div className="text-muted-foreground truncate text-xs">{opt.category}</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
