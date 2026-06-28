'use client';

import { Button, Input, ScrollArea } from '@trycompai/ui';
import { ArrowLeft, Check, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface RequirementOption {
  id: string;
  identifier: string | null;
  name: string;
}

interface ControlRequirementSelectProps {
  controlName: string;
  requirements: RequirementOption[];
  isLoading: boolean;
  isLinking: boolean;
  onBack: () => void;
  onConfirm: (requirementIds: string[]) => void;
}

function requirementLabel(req: RequirementOption): string {
  if (req.identifier && req.name) return `${req.identifier} — ${req.name}`;
  return req.name || req.identifier || 'Unnamed requirement';
}

/**
 * Second step of "Add Existing Control": pick which of the framework's
 * requirements to link the control to. Requirements arrive oldest-first, so the
 * just-created one sits at the bottom of the list.
 */
export function ControlRequirementSelect({
  controlName,
  requirements,
  isLoading,
  isLinking,
  onBack,
  onConfirm,
}: ControlRequirementSelectProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return requirements;
    return requirements.filter((req) =>
      requirementLabel(req).toLowerCase().includes(term),
    );
  }, [requirements, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 rounded-sm px-2"
          onClick={onBack}
          disabled={isLinking}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
        <span className="text-muted-foreground truncate text-sm">
          Link <span className="text-foreground font-medium">{controlName}</span> to
          requirements
        </span>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
        <Input
          placeholder="Search requirements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm pl-8"
          autoFocus
        />
      </div>

      <ScrollArea className="h-[280px] rounded-sm border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            {search
              ? `No requirements matching "${search}"`
              : 'This framework has no requirements yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filtered.map((req) => {
              const selected = selectedIds.has(req.id);
              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => toggle(req.id)}
                  className={`hover:bg-muted/50 flex w-full items-center gap-2 rounded-sm p-2 text-left ${
                    selected ? 'bg-muted/60' : ''
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate text-sm">{requirementLabel(req)}</span>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {selectedIds.size} selected
        </span>
        <Button
          size="sm"
          className="rounded-sm"
          disabled={selectedIds.size === 0 || isLinking}
          onClick={() => onConfirm([...selectedIds])}
        >
          {isLinking ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Link to {selectedIds.size || ''} requirement{selectedIds.size === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
}
