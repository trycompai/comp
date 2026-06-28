'use client';

import { apiClient } from '@/app/lib/api-client';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { FrameworkRequirementOption, MappedRequirement } from './types';

interface FrameworkWithRequirements {
  requirements: FrameworkRequirementOption[];
}

interface IsmsRequirementsCellProps {
  templateId: string;
  requirements: MappedRequirement[];
  frameworkId: string;
  onLinked: (templateId: string, requirement: MappedRequirement) => void;
  onUnlinked: (templateId: string, requirementId: string) => void;
}

function buildRequirementLabel(requirement: FrameworkRequirementOption): string {
  if (requirement.identifier && requirement.name) {
    return `${requirement.identifier} - ${requirement.name}`;
  }
  return requirement.name || requirement.identifier || 'Unnamed Requirement';
}

export function IsmsRequirementsCell({
  templateId,
  requirements,
  frameworkId,
  onLinked,
  onUnlinked,
}: IsmsRequirementsCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [allRequirements, setAllRequirements] = useState<MappedRequirement[]>([]);
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
    if (isSearching && allRequirements.length === 0) {
      setIsLoading(true);
      apiClient<FrameworkWithRequirements>(`/framework/${frameworkId}`)
        .then((framework) =>
          (framework.requirements ?? []).map((r) => ({
            id: r.id,
            name: buildRequirementLabel(r),
          })),
        )
        .then(setAllRequirements)
        .catch(() => toast.error('Failed to load requirements'))
        .finally(() => setIsLoading(false));
    }
  }, [isSearching, allRequirements.length, frameworkId]);

  const filteredRequirements = useMemo(() => {
    const linkedIds = new Set(requirements.map((r) => r.id));
    return allRequirements
      .filter((r) => !linkedIds.has(r.id))
      .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [allRequirements, requirements, search]);

  const handleLink = useCallback(
    async (requirement: MappedRequirement) => {
      try {
        await apiClient(
          `/isms-document-template/${templateId}/requirements/${requirement.id}?frameworkId=${frameworkId}`,
          { method: 'POST' },
        );
        onLinked(templateId, requirement);
        toast.success(`Mapped ${requirement.name}`);
      } catch {
        toast.error('Failed to map requirement');
      }
      setSearch('');
      setIsSearching(false);
    },
    [templateId, frameworkId, onLinked],
  );

  const handleUnlink = useCallback(
    async (requirementId: string) => {
      const requirement = requirements.find((r) => r.id === requirementId);
      try {
        await apiClient(
          `/isms-document-template/${templateId}/requirements/${requirementId}?frameworkId=${frameworkId}`,
          { method: 'DELETE' },
        );
        onUnlinked(templateId, requirementId);
        toast.success(`Unmapped ${requirement?.name ?? 'requirement'}`);
      } catch {
        toast.error('Failed to unmap requirement');
      }
    },
    [templateId, frameworkId, requirements, onUnlinked],
  );

  if (!isExpanded) {
    return (
      <div
        className="hover:bg-muted/50 flex h-full cursor-pointer items-center px-2 py-1.5"
        onClick={() => setIsExpanded(true)}
      >
        {requirements.length === 0 ? (
          <span className="text-muted-foreground text-sm italic">None</span>
        ) : (
          <span className="text-muted-foreground text-sm">
            {requirements.length}{' '}
            {requirements.length === 1 ? 'requirement' : 'requirements'}
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
        <span className="text-sm font-medium">Mapped Requirements</span>
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
        {requirements.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-sm italic">
            No requirements mapped
          </div>
        ) : (
          <div className="space-y-1">
            {requirements.map((requirement) => (
              <div
                key={requirement.id}
                className="bg-muted/50 group flex items-center justify-between rounded-xs px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{requirement.name}</span>
                <button
                  type="button"
                  onClick={() => handleUnlink(requirement.id)}
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
              placeholder="Search requirements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-border bg-background focus:border-primary mb-2 w-full rounded-xs border px-2 py-1.5 text-sm outline-none"
              autoFocus
            />
            <div className="max-h-32 overflow-auto">
              {isLoading ? (
                <div className="text-muted-foreground py-2 text-center text-sm">Loading...</div>
              ) : filteredRequirements.length === 0 ? (
                <div className="text-muted-foreground py-2 text-center text-sm">
                  {search ? 'No matches' : 'All mapped'}
                </div>
              ) : (
                filteredRequirements.slice(0, 10).map((requirement) => (
                  <button
                    key={requirement.id}
                    type="button"
                    className="hover:bg-muted w-full rounded-xs px-2 py-1.5 text-left text-sm"
                    onClick={() => handleLink(requirement)}
                  >
                    <div className="truncate">{requirement.name}</div>
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
            Map Requirement
          </button>
        )}
      </div>
    </div>
  );
}
