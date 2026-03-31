'use client';

import { apiClient } from '@/app/lib/api-client';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ControlTemplate {
  id: string;
  name: string;
  documentTypes: string[];
}

interface DocumentControlsCellProps {
  documentType: string;
  controls: { id: string; name: string }[];
  onControlLinked: (documentType: string, control: { id: string; name: string }) => void;
  onControlUnlinked: (documentType: string, controlId: string) => void;
}

export function DocumentControlsCell({
  documentType,
  controls,
  onControlLinked,
  onControlUnlinked,
}: DocumentControlsCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [allControls, setAllControls] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (isSearching && allControls.length === 0) {
      setIsLoading(true);
      apiClient<ControlTemplate[]>('/control-template')
        .then((data: ControlTemplate[]) =>
          data.map((c: ControlTemplate) => ({ id: c.id, name: c.name || 'Unnamed Control' })),
        )
        .then(setAllControls)
        .catch(() => toast.error('Failed to load controls'))
        .finally(() => setIsLoading(false));
    }
  }, [isSearching, allControls.length]);

  const filteredControls = useMemo(() => {
    const linkedIds = new Set(controls.map((c) => c.id));
    return allControls
      .filter((c) => !linkedIds.has(c.id))
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [allControls, controls, search]);

  const handleLink = useCallback(
    async (control: { id: string; name: string }) => {
      try {
        const current = await apiClient<ControlTemplate>(`/control-template/${control.id}`);
        const currentTypes: string[] = Array.isArray(current.documentTypes)
          ? current.documentTypes
          : [];
        if (!currentTypes.includes(documentType)) {
          await apiClient(`/control-template/${control.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ documentTypes: [...currentTypes, documentType] }),
          });
        }
        onControlLinked(documentType, control);
        toast.success(`Linked to ${control.name}`);
      } catch {
        toast.error('Failed to link control');
      }
      setSearch('');
      setIsSearching(false);
    },
    [documentType, onControlLinked],
  );

  const handleUnlink = useCallback(
    async (controlId: string) => {
      const control = controls.find((c) => c.id === controlId);
      try {
        const current = await apiClient<ControlTemplate>(`/control-template/${controlId}`);
        const currentTypes: string[] = Array.isArray(current.documentTypes)
          ? current.documentTypes
          : [];
        await apiClient(`/control-template/${controlId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            documentTypes: currentTypes.filter((t) => t !== documentType),
          }),
        });
        onControlUnlinked(documentType, controlId);
        toast.success(`Unlinked from ${control?.name ?? 'control'}`);
      } catch {
        toast.error('Failed to unlink control');
      }
    },
    [documentType, controls, onControlUnlinked],
  );

  if (!isExpanded) {
    return (
      <div
        className="hover:bg-muted/50 flex h-full cursor-pointer items-center px-2 py-1.5"
        onClick={() => setIsExpanded(true)}
      >
        {controls.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">None</span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {controls.length} {controls.length === 1 ? 'control' : 'controls'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-popover border-border absolute left-0 top-0 z-50 min-w-[280px] rounded-xs border shadow-lg"
      ref={containerRef}
    >
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Linked Controls</span>
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

      <div className="max-h-48 overflow-auto p-2">
        {controls.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-sm italic">
            No controls linked
          </div>
        ) : (
          <div className="space-y-1">
            {controls.map((control) => (
              <div
                key={control.id}
                className="bg-muted/50 group flex items-center justify-between rounded-xs px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{control.name}</span>
                <button
                  type="button"
                  onClick={() => handleUnlink(control.id)}
                  className="text-muted-foreground hover:text-destructive ml-2 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-border border-t p-2">
        {isSearching ? (
          <>
            <input
              type="text"
              placeholder="Search controls..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-background mb-2 w-full rounded-xs border px-2 py-1.5 text-sm outline-none focus:border-primary"
              autoFocus
            />
            <div className="max-h-32 overflow-auto">
              {isLoading ? (
                <div className="text-muted-foreground py-2 text-center text-sm">Loading...</div>
              ) : filteredControls.length === 0 ? (
                <div className="text-muted-foreground py-2 text-center text-sm">
                  {search ? 'No matches' : 'All linked'}
                </div>
              ) : (
                filteredControls.slice(0, 10).map((control) => (
                  <button
                    key={control.id}
                    type="button"
                    className="hover:bg-muted w-full rounded-xs px-2 py-1.5 text-left text-sm"
                    onClick={() => handleLink(control)}
                  >
                    <div className="truncate">{control.name}</div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsSearching(true)}
            className="border-border hover:bg-muted flex w-full items-center justify-center gap-1 rounded-xs border px-3 py-1.5 text-sm"
          >
            <Plus className="h-3 w-3" />
            Add Control
          </button>
        )}
      </div>
    </div>
  );
}
