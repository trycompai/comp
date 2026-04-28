'use client';

import { api } from '@/lib/api-client';
import type { Policy, PolicyStatus } from '@db';
import {
  Button,
  Checkbox,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface PolicyDownloadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policies: Pick<Policy, 'id' | 'name' | 'status'>[];
}

type PolicyRow = Pick<Policy, 'id' | 'name' | 'status'>;

const STATUS_ORDER: PolicyStatus[] = ['published', 'needs_review', 'draft'];
const STATUS_LABEL: Record<PolicyStatus, string> = {
  published: 'Published',
  needs_review: 'Needs review',
  draft: 'Draft',
};

export function PolicyDownloadSheet({
  open,
  onOpenChange,
  policies,
}: PolicyDownloadSheetProps) {
  const allIds = useMemo(() => policies.map((p) => p.id), [policies]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));
  const [isDownloading, setIsDownloading] = useState(false);
  const [query, setQuery] = useState('');

  // Reset selection + search whenever the sheet opens or the underlying policy
  // list changes, so reopens and prop refreshes don't leave stale or deleted
  // IDs in the selection.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(allIds));
    setQuery('');
  }, [open, allIds]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPolicies = useMemo(() => {
    if (!normalizedQuery) return policies;
    return policies.filter((p) =>
      (p.name ?? '').toLowerCase().includes(normalizedQuery),
    );
  }, [policies, normalizedQuery]);

  const groups = useMemo(() => {
    const byStatus = new Map<PolicyStatus, PolicyRow[]>();
    for (const p of filteredPolicies) {
      const status = (p.status ?? 'draft') as PolicyStatus;
      const list = byStatus.get(status) ?? [];
      list.push(p);
      byStatus.set(status, list);
    }
    return STATUS_ORDER.filter((s) => (byStatus.get(s)?.length ?? 0) > 0).map(
      (s) => ({ status: s, items: byStatus.get(s) ?? [] }),
    );
  }, [filteredPolicies]);

  const visibleIds = useMemo(
    () => filteredPolicies.map((p) => p.id),
    [filteredPolicies],
  );
  const visibleSelectedCount = visibleIds.filter((id) =>
    selected.has(id),
  ).length;
  const allVisibleChecked =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const someVisibleChecked =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const handleToggleGroup = (groupIds: string[]) => {
    const allChecked = groupIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        for (const id of groupIds) next.delete(id);
      } else {
        for (const id of groupIds) next.add(id);
      }
      return next;
    });
  };

  const handleDownload = async () => {
    if (selected.size === 0) return;
    setIsDownloading(true);
    try {
      const ids = Array.from(selected).join(',');
      const url = `/v1/policies/download-all?policyIds=${encodeURIComponent(ids)}`;
      const res = await api.get<{
        downloadUrl: string;
        name: string;
        policyCount: number;
      }>(url);

      if (res.error || !res.data?.downloadUrl) {
        toast.error('Failed to generate PDF. Please try again.');
        return;
      }

      const link = document.createElement('a');
      link.href = res.data.downloadUrl;
      link.download = `${res.data.name ?? 'policies'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onOpenChange(false);
    } catch {
      toast.error('Failed to download policies.');
    } finally {
      setIsDownloading(false);
    }
  };

  const count = selected.size;
  const buttonLabel =
    count === 0
      ? 'Download'
      : `Download ${count} ${count === 1 ? 'policy' : 'policies'}`;

  const hasAnyResults = filteredPolicies.length > 0;
  const totalDiffersFromVisible = count !== visibleSelectedCount;
  const selectAllSuffix = totalDiffersFromVisible
    ? `, ${count} total selected`
    : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Download policies</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Stack gap="md">
            <Input
              type="search"
              placeholder="Search policies…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search policies"
            />

            <div className="flex items-center gap-2 border-b pb-3">
              <Checkbox
                checked={allVisibleChecked}
                indeterminate={someVisibleChecked}
                onCheckedChange={handleToggleVisible}
                aria-label="Select all"
                disabled={!hasAnyResults}
              />
              <Text>
                Select all ({visibleSelectedCount} of {visibleIds.length} shown
                {selectAllSuffix})
              </Text>
            </div>

            {!hasAnyResults && <Text>No policies match "{query}".</Text>}

            {hasAnyResults &&
              groups.map((group) => {
                const groupIds = group.items.map((p) => p.id);
                const groupChecked =
                  groupIds.length > 0 &&
                  groupIds.every((id) => selected.has(id));
                const groupSome =
                  !groupChecked && groupIds.some((id) => selected.has(id));

                return (
                  <div key={group.status} className="flex flex-col">
                    <div className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={groupChecked}
                        indeterminate={groupSome}
                        onCheckedChange={() => handleToggleGroup(groupIds)}
                        aria-label={`Toggle ${STATUS_LABEL[group.status]} group`}
                      />
                      <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        {STATUS_LABEL[group.status]} ({group.items.length})
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {group.items.map((policy) => (
                        <div
                          key={policy.id}
                          className="hover:bg-muted/40 flex h-10 items-center gap-2 rounded-sm px-2"
                        >
                          <Checkbox
                            checked={selected.has(policy.id)}
                            onCheckedChange={() => handleToggle(policy.id)}
                            aria-label={policy.name ?? 'Policy'}
                          />
                          <Text>{policy.name}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </Stack>
        </SheetBody>
        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            loading={isDownloading}
            disabled={count === 0}
          >
            {buttonLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
