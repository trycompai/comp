'use client';

import { usePermissions } from '@/hooks/use-permissions';
import { apiClient } from '@/lib/api-client';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Add, Unlink } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { usePolicy } from '../hooks/usePolicy';

type MappedControl = Pick<Control, 'id' | 'name' | 'description'>;

interface ControlsResponse {
  mappedControls: MappedControl[];
  allControls: MappedControl[];
}

interface PolicyControlMappingsProps {
  mappedControls: Control[];
  allControls: Control[];
  isPendingApproval: boolean;
  onMutate?: () => void;
}

export function PolicyControlMappings({
  mappedControls: initialMapped,
  allControls: initialAll,
  isPendingApproval,
  onMutate,
}: PolicyControlMappingsProps) {
  const { orgId, policyId } = useParams<{ orgId: string; policyId: string }>();
  const router = useRouter();
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

  const { addControlMappings, removeControlMapping } = usePolicy({
    policyId,
    organizationId: orgId,
  });

  const mappedControls = controlsData?.mappedControls ?? initialMapped;
  const allControls = controlsData?.allControls ?? initialAll;
  const mappedIds = new Set(mappedControls.map((c) => c.id));
  const availableControls = allControls.filter((c) => !mappedIds.has(c.id));

  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshAll = async () => {
    await mutateControls();
    onMutate?.();
  };

  const handleAdd = async (id: string) => {
    if (!canMutate || loading) return;
    setLoading(true);
    setAddOpen(false);
    try {
      await addControlMappings([id]);
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

  const handleRowClick = (controlId: string) => {
    router.push(`/${orgId}/controls/${controlId}`);
  };

  return (
    <Section
      title="Controls"
      description="Controls relevant to this policy."
      actions={
        canMutate ? (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger
              disabled={isPendingApproval || loading}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Add size={14} />
              Link control
            </PopoverTrigger>
            <PopoverContent align="end">
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
        ) : undefined
      }
    >
      {mappedControls.length === 0 ? (
        <Text size="sm" variant="muted">
          No controls mapped yet.
        </Text>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {canMutate && <TableHead style={{ width: 48 }} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappedControls.map((control) => (
              <TableRow
                key={control.id}
                onClick={() => handleRowClick(control.id)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Link
                    href={`/${orgId}/controls/${control.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="block"
                  >
                    <Text size="sm" weight="medium">
                      {control.name}
                    </Text>
                  </Link>
                </TableCell>
                {canMutate && (
                  <TableCell style={{ width: 48 }}>
                    <button
                      type="button"
                      aria-label={`Unlink ${control.name}`}
                      title="Unlink control"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToRemove({ id: control.id, name: control.name });
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-destructive hover:bg-destructive/10"
                    >
                      <Unlink size={14} />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open) setToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink control</AlertDialogTitle>
            <AlertDialogDescription>
              {toRemove ? (
                <>
                  Unlink <strong>{toRemove.name}</strong> from this policy? You can link it
                  again later.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className={buttonVariants({ variant: 'destructive', size: 'sm' })}
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
