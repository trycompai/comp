'use client';

import { Button } from '@trycompai/ui';
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface RelationalItem {
  id: string;
  name: string;
  sublabel?: string;
}

interface RelationalCellProps {
  items: RelationalItem[];
  rowId: string;
  isNewRow: boolean;
  getAllItems: () => Promise<RelationalItem[]>;
  onLink: (parentId: string, itemId: string) => Promise<void>;
  onUnlink: (parentId: string, itemId: string) => Promise<void>;
  onLocalUpdate: (newItems: RelationalItem[]) => void;
  label: string;
  labelPlural: string;
}

export function RelationalCell({
  items,
  rowId,
  isNewRow,
  getAllItems,
  onLink,
  onUnlink,
  onLocalUpdate,
  label,
  labelPlural,
}: RelationalCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [allItems, setAllItems] = useState<RelationalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setIsSearching(false);
        setSearch('');
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Fetch items when search opens
  useEffect(() => {
    if (isSearching && allItems.length === 0) {
      setIsLoading(true);
      getAllItems()
        .then(setAllItems)
        .catch(() => toast.error(`Failed to load ${labelPlural.toLowerCase()}`))
        .finally(() => setIsLoading(false));
    }
  }, [isSearching, allItems.length, getAllItems, labelPlural]);

  const filteredItems = useMemo(() => {
    const linkedIds = new Set(items.map((i) => i.id));
    return allItems
      .filter((item) => !linkedIds.has(item.id))
      .filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.sublabel?.toLowerCase().includes(search.toLowerCase()),
      );
  }, [allItems, items, search]);

  const handleLink = async (item: RelationalItem) => {
    if (isNewRow) {
      onLocalUpdate([...items, item]);
      toast.success(`${label} will be linked when you commit`);
    } else {
      try {
        await onLink(rowId, item.id);
        onLocalUpdate([...items, item]);
        toast.success(`${label} linked successfully`);
      } catch {
        toast.error(`Failed to link ${label}`);
      }
    }
    setSearch('');
    setIsSearching(false);
  };

  const handleUnlink = async (item: RelationalItem) => {
    if (isNewRow) {
      onLocalUpdate(items.filter((i) => i.id !== item.id));
      toast.success(`${label} removed`);
    } else {
      try {
        await onUnlink(rowId, item.id);
        onLocalUpdate(items.filter((i) => i.id !== item.id));
        toast.success(`${label} unlinked successfully`);
      } catch {
        toast.error(`Failed to unlink ${label}`);
      }
    }
  };

  // Collapsed view - always show count
  if (!isExpanded) {
    return (
      <div
        className="hover:bg-muted/50 flex h-full cursor-pointer items-center px-2 py-1.5"
        onClick={() => setIsExpanded(true)}
      >
        {items.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">None</span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {items.length} {items.length === 1 ? label.toLowerCase() : labelPlural.toLowerCase()}
          </span>
        )}
      </div>
    );
  }

  // Expanded view - show all items with controls
  return (
    <div
      className="bg-popover border-border absolute left-0 top-0 z-50 min-w-[280px] rounded-xs border shadow-lg"
      ref={containerRef}
    >
      {/* Header */}
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Linked {labelPlural}</span>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setIsSearching(false);
            setSearch('');
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current items */}
      <div className="max-h-48 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-sm italic">
            No {labelPlural.toLowerCase()} linked
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-muted/50 group flex items-center justify-between rounded-xs px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{item.name}</div>
                  {item.sublabel && (
                    <div className="text-muted-foreground truncate text-xs">{item.sublabel}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnlink(item)}
                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add section */}
      {!isNewRow && (
        <div className="border-border border-t p-2">
          {isSearching ? (
            <>
              <input
                type="text"
                placeholder={`Search ${labelPlural.toLowerCase()}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-border bg-background mb-2 w-full rounded-xs border px-2 py-1.5 text-sm outline-none focus:border-primary"
                autoFocus
              />
              <div className="max-h-32 overflow-auto">
                {isLoading ? (
                  <div className="text-muted-foreground py-2 text-center text-sm">Loading...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-muted-foreground py-2 text-center text-sm">
                    {search ? 'No matches' : 'All linked'}
                  </div>
                ) : (
                  filteredItems.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="hover:bg-muted w-full rounded-xs px-2 py-1.5 text-left text-sm"
                      onClick={() => handleLink(item)}
                    >
                      <div className="truncate">{item.name}</div>
                      {item.sublabel && (
                        <div className="text-muted-foreground truncate text-xs">
                          {item.sublabel}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xs"
              onClick={() => setIsSearching(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add {label}
            </Button>
          )}
        </div>
      )}

      {isNewRow && (
        <div className="border-border text-muted-foreground border-t p-2 text-center text-xs">
          Save row first to link items
        </div>
      )}
    </div>
  );
}
