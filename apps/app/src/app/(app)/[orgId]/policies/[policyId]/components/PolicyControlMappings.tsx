'use client';

import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/hooks/use-permissions';
import type { Control } from '@db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
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
import { Add, Close } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { usePolicy } from '../hooks/usePolicy';

type MappedControl = Pick<Control, 'id' | 'name' | 'description'>;

interface ControlsResponse {
  mappedControls: MappedControl[];
  allControls: MappedControl[];
}

function ControlChip({
  control,
  orgId,
  canRemove,
  onRequestRemove,
}: {
  control: MappedControl;
  orgId: string;
  canRemove: boolean;
  onRequestRemove: (control: MappedControl) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border bg-muted/30 text-sm hover:bg-muted/60 transition-colors">
      <Link
        href={`/${orgId}/controls/${control.id}`}
        className="px-3 py-1 hover:underline"
      >
        {control.name}
      </Link>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRequestRemove(control)}
          aria-label={`Remove ${control.name}`}
          className="border-l mr-0.5 ml-0.5 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Close size={14} />
        </button>
      )}
    </div>
  );
}

function RemoveControlDialog({
  control,
  onCancel,
  onConfirm,
}: {
  control: MappedControl | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={control !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove control mapping</AlertDialogTitle>
          <AlertDialogDescription>
            {control ? (
              <>
                Remove <strong>{control.name}</strong> from this policy? You
                can map it again later.
              </>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const PolicyControlMappings = ({
  mappedControls: initialMapped,
  allControls: initialAll,
  isPendingApproval,
  onMutate,
}: {
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}) => {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [controlToRemove, setControlToRemove] = useState<MappedControl | null>(
    null,
  );
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('policy', 'update');

  const { data, mutate: mutateControls } = useSWR(
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

  const mappedControls = data?.mappedControls ?? initialMapped;
  const allControls = data?.allControls ?? initialAll;

  const { addControlMappings, removeControlMapping } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const canMutate = canUpdate && !isPendingApproval;
  const mappedIds = new Set(mappedControls.map((c) => c.id));
  const availableControls = allControls.filter((c) => !mappedIds.has(c.id));

  const handleAdd = async (id: string) => {
    if (!canMutate || loading) return;
    setLoading(true);
    setAddOpen(false);
    try {
      await addControlMappings([id]);
      await mutateControls();
      onMutate?.();
      toast.success('Control mapped successfully');
    } catch {
      toast.error('Failed to map control');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!controlToRemove || !canMutate || loading) {
      setControlToRemove(null);
      return;
    }
    const target = controlToRemove;
    setLoading(true);
    try {
      await removeControlMapping(target.id);
      await mutateControls();
      onMutate?.();
      toast.success('Control unmapped successfully');
    } catch {
      toast.error('Failed to unmap control');
    } finally {
      setLoading(false);
      setControlToRemove(null);
    }
  };

  return (
    <Section
      title="Controls"
      description="Controls relevant to this policy."
    >
      <Stack gap="md">
        {canMutate && (
          <div>
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger
                disabled={isPendingApproval || loading}
                render={
                  <Button variant="outline" size="sm">
                    <Add size={14} />
                    Add controls
                  </Button>
                }
              />
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

        {mappedControls.length === 0 ? (
          <Text size="sm" variant="muted">
            No controls mapped yet.
          </Text>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mappedControls.map((control) => (
              <ControlChip
                key={control.id}
                control={control}
                orgId={orgId}
                canRemove={canMutate}
                onRequestRemove={setControlToRemove}
              />
            ))}
          </div>
        )}
      </Stack>

      <RemoveControlDialog
        control={controlToRemove}
        onCancel={() => setControlToRemove(null)}
        onConfirm={handleConfirmRemove}
      />
    </Section>
  );
};
