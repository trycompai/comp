'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import type { Control } from '@db';
import {
  buttonVariants,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Section,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { usePolicy } from '../hooks/usePolicy';
import { usePolicyEvidenceTasks } from '../hooks/usePolicyEvidenceTasks';
import { ControlSection } from './policy-mappings/ControlSection';
import { RemoveControlDialog } from './policy-mappings/RemoveControlDialog';

type MappedControl = Pick<Control, 'id' | 'name' | 'description'>;

interface ControlsResponse {
  mappedControls: MappedControl[];
  allControls: MappedControl[];
}

interface PolicyMappingsProps {
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function PolicyMappings({
  mappedControls: initialMapped,
  allControls: initialAll,
  isPendingApproval,
  onMutate,
}: PolicyMappingsProps) {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const { hasPermission } = usePermissions();
  const canMutate = hasPermission('policy', 'update') && !isPendingApproval;

  const { data: controlsData, mutate: mutateControls } = useSWR(
    [`/v1/policies/${policyId}/controls`, orgId],
    async () => {
      const res = await apiClient.get<ControlsResponse>(
        `/v1/policies/${policyId}/controls`,
      );
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    {
      fallbackData: { mappedControls: initialMapped, allControls: initialAll },
      revalidateOnMount: false,
      revalidateOnFocus: false,
    },
  );

  const { groups, mutate: mutateGroups } = usePolicyEvidenceTasks({
    policyId,
    organizationId: orgId,
  });

  const { addControlMappings, removeControlMapping } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const allControls = controlsData?.allControls ?? initialAll;
  const mappedIds = new Set(groups.map((g) => g.control.id));
  const availableControls = allControls.filter((c) => !mappedIds.has(c.id));

  // Default state: ALL controls expanded. As new controls are added later we
  // expand them by default while preserving any user-collapsed state.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.control.id)),
  );
  const [seenIds, setSeenIds] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.control.id)),
  );

  useEffect(() => {
    const currentIds = groups.map((g) => g.control.id);
    const newIds = currentIds.filter((id) => !seenIds.has(id));
    if (newIds.length === 0) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });
    setSeenIds((prev) => {
      const next = new Set(prev);
      for (const id of currentIds) next.add(id);
      return next;
    });
  }, [groups, seenIds]);

  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const refreshAll = async () => {
    await Promise.all([mutateGroups(), mutateControls()]);
    onMutate?.();
  };

  const handleToggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = async (id: string) => {
    if (!canMutate || loading) return;
    setLoading(true);
    setAddOpen(false);
    try {
      await addControlMappings([id]);
      setExpanded((prev) => new Set(prev).add(id));
      await refreshAll();
      toast.success('Control mapped successfully');
    } catch {
      toast.error('Failed to map control');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!toRemove || !canMutate || loading) {
      setToRemove(null);
      return;
    }
    const target = toRemove;
    setLoading(true);
    try {
      await removeControlMapping(target.id);
      await refreshAll();
      toast.success('Control unmapped successfully');
    } catch {
      toast.error('Failed to unmap control');
    } finally {
      setLoading(false);
      setToRemove(null);
    }
  };

  return (
    <Section
      title="Controls"
      description="Controls mapped to this policy. Expand a control to see the tasks that demonstrate it."
    >
      <Stack gap="md">
        {groups.length === 0 ? (
          <Text size="sm" variant="muted">
            No controls mapped yet.
          </Text>
        ) : (
          <div className="overflow-hidden rounded-md border divide-y divide-border">
            {groups.map((group) => (
              <ControlSection
                key={group.control.id}
                group={group}
                orgId={orgId}
                isExpanded={expanded.has(group.control.id)}
                onToggle={() => handleToggle(group.control.id)}
                canRemove={canMutate}
                onRequestRemove={() =>
                  setToRemove({ id: group.control.id, name: group.control.name })
                }
              />
            ))}
          </div>
        )}

        {canMutate && (
          <div>
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger
                disabled={isPendingApproval || loading}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Add size={14} />
                Add controls
              </PopoverTrigger>
              <PopoverContent align="start">
                <Command>
                  <CommandInput placeholder="Search controls..." />
                  <CommandList>
                    <CommandEmpty>No controls found.</CommandEmpty>
                    {availableControls.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => handleAdd(c.id)}
                      >
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </Stack>

      <RemoveControlDialog
        control={toRemove}
        onCancel={() => setToRemove(null)}
        onConfirm={handleConfirmRemove}
      />
    </Section>
  );
}
