'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useApi } from '@/hooks/use-api';
import { useApiSWR } from '@/hooks/use-api-swr';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  HStack,
  Input,
  Label,
  Section,
  Stack,
  Switch,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { Add, TrashCan } from '@trycompai/design-system/icons';

interface TemplateItem {
  id: string;
  title: string;
  description: string | null;
  evidenceRequired: boolean;
  sortOrder: number;
  isDefault: boolean;
  isEnabled: boolean;
}

const TEMPLATE_ENDPOINT = '/v1/offboarding-checklist/template';

export function OffboardingChecklistSettings() {
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('organization', 'update');
  const { post, patch, delete: deleteReq } = useApi();

  const { data, mutate } = useApiSWR<TemplateItem[]>(TEMPLATE_ENDPOINT);
  const items = Array.isArray(data?.data) ? data.data : [];

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggleEnabled = async ({
    item,
    next,
  }: {
    item: TemplateItem;
    next: boolean;
  }) => {
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: Array.isArray(current.data)
            ? current.data.map((i) =>
                i.id === item.id ? { ...i, isEnabled: next } : i,
              )
            : current.data,
        };
      },
      { revalidate: false },
    );

    const res = await patch(
      `${TEMPLATE_ENDPOINT}/${item.id}`,
      { isEnabled: next },
    );

    if (res.error) {
      mutate();
      toast.error('Failed to update checklist item');
      return;
    }

    toast.success(next ? 'Checklist item enabled' : 'Checklist item disabled');
  };

  const handleToggleEvidence = async ({
    item,
    next,
  }: {
    item: TemplateItem;
    next: boolean;
  }) => {
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: Array.isArray(current.data)
            ? current.data.map((i) =>
                i.id === item.id ? { ...i, evidenceRequired: next } : i,
              )
            : current.data,
        };
      },
      { revalidate: false },
    );

    const res = await patch(
      `${TEMPLATE_ENDPOINT}/${item.id}`,
      { evidenceRequired: next },
    );

    if (res.error) {
      mutate();
      toast.error('Failed to update evidence requirement');
      return;
    }

    toast.success(
      next ? 'Evidence now required' : 'Evidence no longer required',
    );
  };

  const handleDelete = async ({ item }: { item: TemplateItem }) => {
    mutate(
      (current) => {
        if (!current) return current;
        return {
          ...current,
          data: Array.isArray(current.data)
            ? current.data.filter((i) => i.id !== item.id)
            : current.data,
        };
      },
      { revalidate: false },
    );

    const res = await deleteReq(`${TEMPLATE_ENDPOINT}/${item.id}`);

    if (res.error) {
      mutate();
      toast.error('Failed to delete checklist item');
      return;
    }

    toast.success('Checklist item deleted');
  };

  return (
    <Section title="Offboarding checklist">
      <Stack gap="md">
        <div className="flex items-center justify-between">
          <Text size="sm" variant="muted">
            Configure the default checklist items for employee offboarding.
          </Text>
          {canUpdate && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button size="sm" variant="outline" />}>
                <Add size={16} />
                Add item
              </DialogTrigger>
              <AddChecklistItemDialog
                onCreated={() => {
                  setDialogOpen(false);
                  mutate();
                }}
              />
            </Dialog>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Text size="sm" variant="muted">
              No checklist items configured yet.
            </Text>
          </div>
        ) : (
          <Stack gap="sm">
            {items.map((item) => (
              <ChecklistItemCard
                key={item.id}
                item={item}
                canUpdate={canUpdate}
                onToggleEnabled={handleToggleEnabled}
                onToggleEvidence={handleToggleEvidence}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Section>
  );
}

function ChecklistItemCard({
  item,
  canUpdate,
  onToggleEnabled,
  onToggleEvidence,
  onDelete,
}: {
  item: TemplateItem;
  canUpdate: boolean;
  onToggleEnabled: (args: { item: TemplateItem; next: boolean }) => void;
  onToggleEvidence: (args: { item: TemplateItem; next: boolean }) => void;
  onDelete: (args: { item: TemplateItem }) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1">
        <HStack gap="sm">
          <Text weight="medium">{item.title}</Text>
          {item.isDefault && (
            <div className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Default
            </div>
          )}
        </HStack>
        {item.description ? (
          <Text size="sm" variant="muted">
            {item.description}
          </Text>
        ) : null}
        <div className="mt-2">
          <HStack gap="sm">
            <Label htmlFor={`evidence-${item.id}`}>
              <Text size="sm">Evidence required</Text>
            </Label>
            <Switch
              id={`evidence-${item.id}`}
              checked={item.evidenceRequired}
              disabled={!canUpdate || !item.isEnabled}
              onCheckedChange={(next) =>
                onToggleEvidence({ item, next: Boolean(next) })
              }
              aria-label={`Evidence required for ${item.title}`}
            />
          </HStack>
        </div>
      </div>
      <HStack gap="sm">
        <Switch
          checked={item.isEnabled}
          disabled={!canUpdate}
          onCheckedChange={(next) =>
            onToggleEnabled({ item, next: Boolean(next) })
          }
          aria-label={`Enable ${item.title}`}
        />
        {!item.isDefault && canUpdate && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete({ item })}
            aria-label={`Delete ${item.title}`}
          >
            <TrashCan size={16} />
          </Button>
        )}
      </HStack>
    </div>
  );
}

function AddChecklistItemDialog({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { post } = useApi();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);

    const res = await post(TEMPLATE_ENDPOINT, {
      title: title.trim(),
      description: description.trim() || undefined,
      evidenceRequired,
    });

    setSaving(false);

    if (res.error) {
      toast.error('Failed to create checklist item');
      return;
    }

    toast.success('Checklist item created');
    setTitle('');
    setDescription('');
    setEvidenceRequired(false);
    onCreated();
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Add checklist item</DialogTitle>
        </DialogHeader>
        <Stack gap="md">
          <div className="grid gap-1.5">
            <Label htmlFor="checklist-title">Title</Label>
            <Input
              id="checklist-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Return company laptop"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="checklist-description">Description</Label>
            <Textarea
              id="checklist-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about this checklist item"
              rows={3}
            />
          </div>
          <HStack gap="sm">
            <Label htmlFor="checklist-evidence">Evidence required</Label>
            <Switch
              id="checklist-evidence"
              checked={evidenceRequired}
              onCheckedChange={(next) =>
                setEvidenceRequired(Boolean(next))
              }
            />
          </HStack>
        </Stack>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
