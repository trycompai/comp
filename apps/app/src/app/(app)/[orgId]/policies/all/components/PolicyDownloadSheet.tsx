'use client';

import { api } from '@/lib/api-client';
import type { Policy, PolicyStatus } from '@db';
import {
  Badge,
  Button,
  Checkbox,
  ScrollArea,
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

type BadgeVariant = 'default' | 'secondary' | 'outline';

const STATUS_LABEL: Record<PolicyStatus, string> = {
  published: 'Published',
  needs_review: 'Needs review',
  draft: 'Draft',
};

const STATUS_VARIANT: Record<PolicyStatus, BadgeVariant> = {
  published: 'default',
  needs_review: 'secondary',
  draft: 'outline',
};

export function PolicyDownloadSheet({
  open,
  onOpenChange,
  policies,
}: PolicyDownloadSheetProps) {
  const allIds = useMemo(() => policies.map((p) => p.id), [policies]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset selection to all current policies whenever the sheet opens or the
  // underlying policy list changes, so reopens and prop refreshes don't leave
  // stale or deleted IDs in the selection.
  useEffect(() => {
    if (!open) return;
    setSelected(new Set(allIds));
  }, [open, allIds]);

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = selected.size === allIds.length && allIds.length > 0;
  const someChecked = selected.size > 0 && !allChecked;

  const handleToggleAll = () => {
    setSelected((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Download policies</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <Stack gap="md">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                onCheckedChange={handleToggleAll}
                aria-label="Select all"
              />
              <Text>
                Select all ({selected.size} of {allIds.length} selected)
              </Text>
            </div>
            <ScrollArea>
              <Stack gap="xs">
                {policies.map((policy) => {
                  const statusKey = policy.status ?? 'draft';
                  return (
                    <div
                      key={policy.id}
                      className="flex items-center gap-2 py-1"
                    >
                      <Checkbox
                        checked={selected.has(policy.id)}
                        onCheckedChange={() => handleToggle(policy.id)}
                        aria-label={policy.name ?? 'Policy'}
                      />
                      <div className="flex flex-1 items-center gap-2">
                        <Text>{policy.name}</Text>
                        <Badge variant={STATUS_VARIANT[statusKey] ?? 'outline'}>
                          {STATUS_LABEL[statusKey] ?? statusKey}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </Stack>
            </ScrollArea>
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
