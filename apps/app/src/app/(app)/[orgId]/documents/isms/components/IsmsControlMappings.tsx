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
  Button,
  buttonVariants,
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
  CommandItem,
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Section,
} from '@trycompai/design-system';
import { Add, Launch, Rule, Unlink } from '@trycompai/design-system/icons';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { useIsmsDocument } from '../hooks/useIsmsDocument';
import type { IsmsControlLink, IsmsDocument } from '../isms-types';
import { IsmsEmptyState } from './shared';

interface SelectableControl {
  id: string;
  name: string;
}

interface ControlsListResponse {
  data: SelectableControl[];
  pageCount?: number;
}

const CONTROLS_PER_PAGE = 100;

/** Fetch every control across all pages so orgs with >1 page can link any control. */
async function fetchAllControls(): Promise<SelectableControl[]> {
  const fetchPage = async (page: number) => {
    const res = await apiClient.get<ControlsListResponse>(
      `/v1/controls?page=${page}&perPage=${CONTROLS_PER_PAGE}`,
    );
    if (res.error) throw new Error(res.error);
    return res.data;
  };

  const first = await fetchPage(1);
  const controls = Array.isArray(first?.data) ? [...first.data] : [];
  const pageCount = first?.pageCount ?? 1;

  if (pageCount > 1) {
    const rest = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2)),
    );
    for (const page of rest) {
      if (Array.isArray(page?.data)) controls.push(...page.data);
    }
  }

  return controls;
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
    fetchAllControls,
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
              <Add size={16} />
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
        <IsmsEmptyState
          compact
          icon={Rule}
          title="No controls linked"
          description="No controls linked yet."
        />
      ) : (
        <ItemGroup>
          {linkedControls.map((link) => (
            <Item
              key={link.id}
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/${organizationId}/controls/${link.controlId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                />
              }
            >
              <ItemMedia variant="icon">
                <Rule size={16} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>
                  {link.control.name}
                  <Launch
                    size={14}
                    className="shrink-0 text-muted-foreground transition-colors group-hover/item:text-foreground"
                  />
                </ItemTitle>
              </ItemContent>
              {canManage && (
                <ItemActions>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Unlink ${link.control.name}`}
                    title="Unlink control"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setToRemove({ id: link.controlId, name: link.control.name });
                    }}
                  >
                    <Unlink size={16} />
                  </Button>
                </ItemActions>
              )}
            </Item>
          ))}
        </ItemGroup>
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
