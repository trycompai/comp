'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectCellProps {
  value: string | null;
  rowId: string;
  columnId: string;
  options: SelectOption[];
  onUpdate: (rowId: string, columnId: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function SelectCell({
  value,
  rowId,
  columnId,
  options,
  onUpdate,
  disabled = false,
  placeholder = 'Select...',
}: SelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onUpdate(rowId, columnId, optionValue);
    setIsOpen(false);
  };

  if (disabled) {
    return (
      <span className="text-muted-foreground block truncate px-2 py-1.5 text-sm">
        {selectedOption?.label ?? value ?? ''}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="hover:bg-muted/50 flex cursor-pointer items-center justify-between px-2 py-1.5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`truncate text-sm ${!selectedOption ? 'text-muted-foreground italic' : ''}`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
      </div>

      {isOpen && (
        <div className="bg-popover border-border absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-xs border shadow-lg">
          <div className="max-h-48 overflow-auto py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`hover:bg-muted w-full px-3 py-1.5 text-left text-sm ${
                  option.value === value ? 'bg-muted font-medium' : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
