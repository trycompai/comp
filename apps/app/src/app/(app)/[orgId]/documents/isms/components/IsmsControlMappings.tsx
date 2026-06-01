'use client';

import { apiClient } from '@/lib/api-client';
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
import { Add, Launch, Unlink } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useIsmsDocument } from '../hooks/useIsmsDocument';
import type { IsmsControlLink, IsmsDocument } from '../isms-types';

interface SelectableControl {
  id: string;
  name: string;
}

interface ControlsListResponse {
  data: SelectableControl[];
}

interface IsmsControlMappingsProps {
  document: IsmsDocument;
  organizationId: string;
  canManage: boolean;
}

export function IsmsControlMappings({
  document,
  organizationId,
  canManage,
}: IsmsControlMappingsProps) {
  const { addControlMappings, removeControlMapping } = useIsmsDocument({
    documentId: document.id,
    organizationId,
  });

  const { data: allControls } = useSWR(
    canManage ? ['/v1/controls', organizationId] : null,
    async () => {
      const res = await apiClient.get<ControlsListResponse>('/v1/controls');
      if (res.error) throw new Error(res.error);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    { revalidateOnFocus: false },
  );

  const linkedControls: IsmsControlLink[] = Array.isArray(document.controlLinks)
    ? document.controlLinks
    : [];
  const linkedIds = new Set(linkedControls.map((link) => link.controlId));
  const availableControls = (Array.isArray(allControls) ? allControls : []).filter(
    (c) => !linkedIds.has(c.id),
  );

  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (id: string) => {
    if (!canManage || loading) return;
    setLoading(true);
    setAddOpen(false);
    try {
      await addControlMappings([id]);
      toast.success('Control linked successfully');
    } catch {
      toast.error('Failed to link control');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!toRemove || !canManage || loading) {
      setToRemove(null);
      return;
    }
    const target = toRemove;
    setLoading(true);
    try {
      await removeControlMapping(target.id);
      toast.success('Control unlinked successfully');
    } catch {
      toast.error('Failed to unlink control');
    } finally {
      setLoading(false);
      setToRemove(null);
    }
  };

  return (
    <Section
      title="Linked controls"
      description="Controls relevant to this ISMS document."
      actions={
        canManage ? (
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger
              disabled={loading}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Add size={14} />
              Link control
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8}>
              <Command>
                <CommandInput placeholder="Search controls..." />
                <div className="h-2" />
                <CommandList>
                  <CommandEmpty>No controls found.</CommandEmpty>
                  {availableControls.map((c) => (
                    <CommandItem key={c.id} value={c.name} onSelect={() => handleAdd(c.id)}>
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
      {linkedControls.length === 0 ? (
        <Text size="sm" variant="muted">
          No controls linked yet.
        </Text>
      ) : (
        <Table variant="bordered">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              {canManage && <TableHead style={{ width: 48 }} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {linkedControls.map((link) => (
              <TableRow key={link.id}>
                <TableCell>
                  <Link
                    href={`/${organizationId}/controls/${link.controlId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="group flex items-center justify-between gap-2"
                  >
                    <Text size="sm" weight="medium">
                      {link.control.name}
                    </Text>
                    <Launch
                      size={14}
                      className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    />
                  </Link>
                </TableCell>
                {canManage && (
                  <TableCell style={{ width: 48 }}>
                    <button
                      type="button"
                      aria-label={`Unlink ${link.control.name}`}
                      title="Unlink control"
                      onClick={(e) => {
                        e.stopPropagation();
                        setToRemove({ id: link.controlId, name: link.control.name });
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
                  Unlink <strong>{toRemove.name}</strong> from this document? You can link it again
                  later.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToRemove(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} variant="destructive">
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
