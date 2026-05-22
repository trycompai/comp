'use client';

import { Button, Text } from '@trycompai/design-system';
import {
  Checkbox,
  CheckboxCheckedFilled,
  Close,
  Filter,
} from '@trycompai/design-system/icons';
import { useEffect, useRef, useState } from 'react';

interface FamilyFilterDropdownProps {
  allFamilyNames: string[];
  selectedFamilies: Set<string>;
  onToggleFamily: (family: string) => void;
  onClear: () => void;
}

export function FamilyFilterDropdown({
  allFamilyNames,
  selectedFamilies,
  onToggleFamily,
  onClear,
}: FamilyFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const hasFilter = selectedFamilies.size > 0;
  const label = hasFilter ? `Families (${selectedFamilies.size})` : 'Families';

  const filteredFamilies = allFamilyNames.filter((f) =>
    f.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <Button variant="outline" onClick={() => setOpen((prev) => !prev)}>
          <Filter size={16} />
          {label}
        </Button>
        {hasFilter && (
          <button
            type="button"
            className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <Close size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border bg-background shadow-lg">
          <input
            type="text"
            placeholder="Search families..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border-b border-border bg-transparent px-3 py-1.5 text-sm outline-none"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredFamilies.map((family) => {
              const isSelected = selectedFamilies.has(family);
              const Icon = isSelected ? CheckboxCheckedFilled : Checkbox;

              return (
                <button
                  key={family}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted cursor-pointer"
                  onClick={() => onToggleFamily(family)}
                >
                  <Icon size={16} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                  <Text size="sm">{family}</Text>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
