'use client';

import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ComboboxCellProps {
  value: string | null;
  rowId: string;
  columnId: string;
  options: string[];
  onUpdate: (rowId: string, columnId: string, value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ComboboxCell({
  value,
  rowId,
  columnId,
  options,
  onUpdate,
  disabled = false,
  placeholder = 'Select...',
}: ComboboxCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const trimmedSearch = search.trim();
  const normalizedSearch = trimmedSearch.toLowerCase();

  const filteredOptions = trimmedSearch
    ? options.filter((opt) => opt.toLowerCase().includes(normalizedSearch))
    : options;

  const exactMatchExists = options.some(
    (opt) => opt.toLowerCase() === normalizedSearch,
  );
  const showCreateOption = trimmedSearch !== '' && !exactMatchExists;

  const handleSelect = (selected: string) => {
    const newValue = selected === value ? '' : selected;
    onUpdate(rowId, columnId, newValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    onUpdate(rowId, columnId, trimmedSearch);
    setIsOpen(false);
    setSearch('');
  };

  if (disabled) {
    return (
      <span className="text-muted-foreground block truncate px-2 py-1.5 text-sm">
        {value ?? ''}
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
          className={`truncate text-sm ${!value ? 'text-muted-foreground italic' : ''}`}
        >
          {value || placeholder}
        </span>
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
      </div>

      {isOpen && (
        <div className="bg-popover border-border absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xs border shadow-lg">
          <div className="border-border flex items-center border-b px-3 py-1.5">
            <Search className="text-muted-foreground mr-2 h-3.5 w-3.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Search..."
            />
          </div>
          <div className="max-h-48 overflow-auto py-1">
            {value && !trimmedSearch && (
              <button
                type="button"
                className="hover:bg-muted text-muted-foreground flex w-full items-center px-3 py-1.5 text-left text-sm italic"
                onClick={() => handleSelect(value)}
              >
                Clear
              </button>
            )}
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`hover:bg-muted flex w-full items-center px-3 py-1.5 text-left text-sm ${
                  option === value ? 'bg-muted font-medium' : ''
                }`}
                onClick={() => handleSelect(option)}
              >
                <span className="flex-1 truncate">{option}</span>
                {option === value && (
                  <Check className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && !showCreateOption && (
              <div className="text-muted-foreground px-3 py-1.5 text-sm">
                No options found
              </div>
            )}
            {showCreateOption && (
              <button
                type="button"
                className="hover:bg-muted border-border flex w-full items-center border-t px-3 py-1.5 text-left text-sm"
                onClick={handleCreate}
              >
                <Plus className="mr-2 h-3.5 w-3.5 shrink-0" />
                Create &ldquo;{trimmedSearch}&rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
