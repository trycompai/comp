'use client';

import {
  Badge,
  Button,
  HStack,
  Heading,
  PageHeader,
  Section,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useFrameworkSync } from '@/hooks/use-framework-sync';
import { useFrameworkUpdatePreview } from '@/hooks/use-framework-update-preview';
import { usePermissions } from '@/hooks/use-permissions';
import type { UpdatePreview } from '@/types/framework-versioning';
import { SyncConfirmDialog } from '../../components/SyncConfirmDialog';

interface Props {
  orgId: string;
  frameworkInstanceId: string;
  frameworkName: string;
  initialPreview: UpdatePreview;
}

type FilterKey = 'all' | 'added' | 'removed' | 'modified';

type ChangeKind = 'added' | 'removed' | 'modified' | 'preserved';

interface ChangeRow {
  key: string;
  identifier?: string;
  name: string;
  description?: string | null;
  kind: ChangeKind;
}

interface ChangeGroup {
  title: string;
  kind: ChangeKind;
  rows: ChangeRow[];
}

export function ReviewUpdateContent({
  orgId,
  frameworkInstanceId,
  frameworkName,
  initialPreview,
}: Props) {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const { sync, isSyncing } = useFrameworkSync(frameworkInstanceId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data } = useFrameworkUpdatePreview(frameworkInstanceId, {
    fallbackData: initialPreview,
  });
  const preview = data ?? initialPreview;

  const canApply = hasPermission('framework', 'update');
  const frameworkHref = `/${orgId}/frameworks/${frameworkInstanceId}`;

  const groups = useMemo<ChangeGroup[]>(
    () => buildGroups(preview),
    [preview],
  );

  // Summary counts: link removals/adds fold into the Removed / New totals.
  const edges = preview.edges ?? {
    controlPolicy: { added: 0, removed: 0 },
    controlTask: { added: 0, removed: 0 },
    controlRequirement: { added: 0, removed: 0 },
    controlDocumentType: { added: 0, removed: 0 },
  };
  const linksAdded =
    edges.controlPolicy.added +
    edges.controlTask.added +
    edges.controlRequirement.added +
    (edges.controlDocumentType?.added ?? 0);
  const linksRemoved =
    edges.controlPolicy.removed +
    edges.controlTask.removed +
    edges.controlRequirement.removed +
    (edges.controlDocumentType?.removed ?? 0);

  const entitiesAdded =
    preview.controls.added.length +
    preview.policies.added.length +
    preview.tasks.added.length +
    preview.requirements.added.length;
  const entitiesRemoved =
    preview.controls.archived.length +
    preview.policies.archived.length +
    preview.tasks.archived.length +
    preview.requirements.removed.length;
  const modifiedCount =
    preview.controls.updatedApplied.length +
    preview.policies.updatedApplied.length +
    preview.tasks.updatedApplied.length +
    preview.requirements.updated.length;
  const preservedCount =
    preview.controls.updatedPreserved.length +
    preview.tasks.updatedPreserved.length +
    preview.policies.updatedPreserved.length +
    preview.policies.draftAddedForPublished.length;

  const addedTotal = entitiesAdded + linksAdded;
  const removedTotal = entitiesRemoved + linksRemoved;
  const linksTotal = linksAdded + linksRemoved;

  const totalChanges = addedTotal + removedTotal + modifiedCount + preservedCount;

  const visibleGroups = useMemo(() => {
    if (filter === 'all') return groups;
    if (filter === 'added') return groups.filter((g) => g.kind === 'added');
    if (filter === 'removed') return groups.filter((g) => g.kind === 'removed');
    return groups.filter((g) => g.kind === 'modified' || g.kind === 'preserved');
  }, [groups, filter]);

  async function handleApply() {
    if (!preview.toVersion.id) return;
    try {
      await sync(preview.toVersion.id);
      toast.success(`Synced to v${preview.toVersion.version}`);
      router.push(frameworkHref);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply update');
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <Stack gap="lg" className="pb-20">
      <PageHeader
        title={`${frameworkName} v${preview.toVersion.version}`}
        backHref={frameworkHref}
        backLabel={`Back to ${frameworkName}`}
      >
        <HStack gap="2" align="center">
          <Badge tone="info">Update available</Badge>
          <Text size="sm" variant="muted">
            Reviewing v{preview.fromVersion.version} → v{preview.toVersion.version}
          </Text>
        </HStack>
      </PageHeader>

      {preview.releaseNotes && (
        <Text variant="muted" className="max-w-3xl">
          {preview.releaseNotes}
        </Text>
      )}

      {/* Summary */}
      <Section title="Summary" description={`${totalChanges} change${totalChanges !== 1 ? 's' : ''} since v${preview.fromVersion.version}`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="New" value={addedTotal} tone="positive" />
          <StatCard label="Removed" value={removedTotal} tone="danger" />
          <StatCard label="Modified" value={modifiedCount + preservedCount} />
          <StatCard label="Links affected" value={linksTotal} />
        </div>
      </Section>

      {/* Filters + list */}
      <Section
        title="Changes"
        description="Filter by what's added, removed, or modified. All changes apply together — this is v1 all-or-nothing sync."
      >
        <Stack gap="md">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <TabsList variant="underline">
              <TabsTrigger value="all">
                All <TabBadge count={totalChanges} />
              </TabsTrigger>
              <TabsTrigger value="added">
                Added <TabBadge count={addedTotal} />
              </TabsTrigger>
              <TabsTrigger value="removed">
                Removed <TabBadge count={removedTotal} />
              </TabsTrigger>
              <TabsTrigger value="modified">
                Modified <TabBadge count={modifiedCount + preservedCount} />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {visibleGroups.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <Text variant="muted">No changes in this category.</Text>
            </div>
          ) : (
            <Stack gap="lg">
              {visibleGroups.map((group) => (
                <Stack key={group.title} gap="3">
                  <HStack justify="between" align="center">
                    <Text size="sm" weight="medium" variant="muted">
                      {group.title}
                    </Text>
                    <Badge variant="outline">{group.rows.length}</Badge>
                  </HStack>
                  <Stack gap="2">
                    {group.rows.map((row) => (
                      <ItemRow key={row.key} row={row} />
                    ))}
                  </Stack>
                </Stack>
              ))}
              {filter !== 'modified' && linksTotal > 0 && (filter === 'all' || (filter === 'added' && linksAdded > 0) || (filter === 'removed' && linksRemoved > 0)) && (
                <LinkChangesBlock
                  edges={edges}
                  show={filter === 'all' ? 'both' : filter === 'added' ? 'added' : 'removed'}
                />
              )}
            </Stack>
          )}
        </Stack>
      </Section>

      {/* Sticky apply bar */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background px-4 py-3 md:-mx-6 md:px-6">
        <HStack justify="between" align="center">
          <Text size="sm" variant="muted">
            Apply will update your framework instance. You can roll back within 14 days.
          </Text>
          <HStack gap="2">
            <Button variant="ghost" onClick={() => router.push(frameworkHref)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canApply || isSyncing || !preview.toVersion.id || totalChanges === 0}
              onClick={() => setConfirmOpen(true)}
            >
              {isSyncing
                ? 'Applying…'
                : `Apply ${totalChanges} change${totalChanges !== 1 ? 's' : ''}`}
            </Button>
          </HStack>
        </HStack>
      </div>

      <SyncConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        preview={preview}
        isSyncing={isSyncing}
        onConfirm={handleApply}
      />
    </Stack>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'danger';
}) {
  const valueClass =
    tone === 'positive' && value > 0
      ? 'text-emerald-600 dark:text-emerald-500'
      : tone === 'danger' && value > 0
        ? 'text-destructive'
        : '';
  return (
    <div className="rounded-md border bg-card p-4">
      <Stack gap="1">
        <Heading level="2" className={valueClass}>
          {value}
        </Heading>
        <Text size="sm" variant="muted" weight="medium">
          {label}
        </Text>
      </Stack>
    </div>
  );
}

function TabBadge({ count }: { count: number }) {
  return (
    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
      {count}
    </span>
  );
}

function ItemRow({ row }: { row: ChangeRow }) {
  const badge =
    row.kind === 'added'
      ? { label: 'Added', variant: 'default' as const }
      : row.kind === 'removed'
        ? { label: 'Removed', variant: 'destructive' as const }
        : row.kind === 'modified'
          ? { label: 'Modified', variant: 'secondary' as const }
          : { label: 'Preserved', variant: 'outline' as const };

  const markerTone =
    row.kind === 'added'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
      : row.kind === 'removed'
        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
        : 'bg-muted text-muted-foreground';
  const marker = row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : '~';

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-card px-4 py-3">
      <HStack gap="3" align="start">
        <span
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-xs font-semibold ${markerTone}`}
        >
          {marker}
        </span>
        <Stack gap="1">
          <HStack gap="2" align="center">
            {row.identifier && (
              <Text
                size="sm"
                weight="medium"
                variant="muted"
                className="font-mono"
              >
                {row.identifier}
              </Text>
            )}
            <Text size="sm" weight="medium">
              {row.name}
            </Text>
          </HStack>
          {row.description && (
            <Text size="sm" variant="muted">
              {row.description}
            </Text>
          )}
        </Stack>
      </HStack>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  );
}

function LinkChangesBlock({
  edges,
  show,
}: {
  edges: UpdatePreview['edges'];
  show: 'both' | 'added' | 'removed';
}) {
  const lines: string[] = [];
  const push = (n: number, label: string, verb: 'added' | 'removed') => {
    if (n === 0) return;
    if (show !== 'both' && show !== verb) return;
    lines.push(`${n} ${label}${n !== 1 ? 's' : ''} ${verb}`);
  };
  push(edges.controlRequirement.added, 'control → requirement link', 'added');
  push(edges.controlRequirement.removed, 'control → requirement link', 'removed');
  push(edges.controlPolicy.added, 'control → policy link', 'added');
  push(edges.controlPolicy.removed, 'control → policy link', 'removed');
  push(edges.controlTask.added, 'control → task link', 'added');
  push(edges.controlTask.removed, 'control → task link', 'removed');
  push(edges.controlDocumentType?.added ?? 0, 'control → document-type link', 'added');
  push(edges.controlDocumentType?.removed ?? 0, 'control → document-type link', 'removed');

  if (lines.length === 0) return null;

  return (
    <Stack gap="3">
      <HStack justify="between" align="center">
        <Text size="sm" weight="medium" variant="muted">
          LINK CHANGES
        </Text>
        <Badge variant="outline">{lines.length}</Badge>
      </HStack>
      <div className="rounded-md border bg-card px-4 py-3">
        <Stack gap="1">
          {lines.map((line) => (
            <Text key={line} size="sm" variant="muted">
              {line}
            </Text>
          ))}
        </Stack>
      </div>
    </Stack>
  );
}

function buildGroups(preview: UpdatePreview): ChangeGroup[] {
  const out: ChangeGroup[] = [];

  // Removed
  if (preview.requirements.removed.length) {
    out.push({
      title: 'REMOVED REQUIREMENTS',
      kind: 'removed',
      rows: preview.requirements.removed.map((r) => ({
        key: `req-rem-${r.id}`,
        identifier: r.identifier,
        name: r.name,
        description: r.description,
        kind: 'removed' as const,
      })),
    });
  }
  if (preview.controls.archived.length) {
    out.push({
      title: 'REMOVED CONTROLS',
      kind: 'removed',
      rows: preview.controls.archived.map(({ instanceId, manifest }) => ({
        key: `ctl-rem-${instanceId}`,
        name: manifest.name,
        description: manifest.description,
        kind: 'removed' as const,
      })),
    });
  }
  if (preview.policies.archived.length) {
    out.push({
      title: 'REMOVED POLICIES',
      kind: 'removed',
      rows: preview.policies.archived.map(({ instanceId, manifest }) => ({
        key: `pol-rem-${instanceId}`,
        name: manifest.name,
        description: manifest.description ?? null,
        kind: 'removed' as const,
      })),
    });
  }
  if (preview.tasks.archived.length) {
    out.push({
      title: 'REMOVED TASKS',
      kind: 'removed',
      rows: preview.tasks.archived.map(({ instanceId, manifest }) => ({
        key: `tsk-rem-${instanceId}`,
        name: manifest.name,
        description: manifest.description,
        kind: 'removed' as const,
      })),
    });
  }

  // Added
  if (preview.requirements.added.length) {
    out.push({
      title: 'NEW REQUIREMENTS',
      kind: 'added',
      rows: preview.requirements.added.map((r) => ({
        key: `req-add-${r.id}`,
        identifier: r.identifier,
        name: r.name,
        description: r.description,
        kind: 'added' as const,
      })),
    });
  }
  if (preview.controls.added.length) {
    out.push({
      title: 'NEW CONTROLS',
      kind: 'added',
      rows: preview.controls.added.map((c) => ({
        key: `ctl-add-${c.id}`,
        name: c.name,
        description: c.description,
        kind: 'added' as const,
      })),
    });
  }
  if (preview.policies.added.length) {
    out.push({
      title: 'NEW POLICIES',
      kind: 'added',
      rows: preview.policies.added.map((p) => ({
        key: `pol-add-${p.id}`,
        name: p.name,
        description: p.description ?? null,
        kind: 'added' as const,
      })),
    });
  }
  if (preview.tasks.added.length) {
    out.push({
      title: 'NEW TASKS',
      kind: 'added',
      rows: preview.tasks.added.map((t) => ({
        key: `tsk-add-${t.id}`,
        name: t.name,
        description: t.description,
        kind: 'added' as const,
      })),
    });
  }

  // Modified
  if (preview.requirements.updated.length) {
    out.push({
      title: 'MODIFIED REQUIREMENTS',
      kind: 'modified',
      rows: preview.requirements.updated.map(({ to }) => ({
        key: `req-mod-${to.id}`,
        identifier: to.identifier,
        name: to.name,
        description: to.description,
        kind: 'modified' as const,
      })),
    });
  }
  if (preview.controls.updatedApplied.length) {
    out.push({
      title: 'MODIFIED CONTROLS',
      kind: 'modified',
      rows: preview.controls.updatedApplied.map(({ instance, manifestTo }) => ({
        key: `ctl-mod-${instance.id}`,
        name: manifestTo.name,
        description: manifestTo.description,
        kind: 'modified' as const,
      })),
    });
  }
  if (preview.policies.updatedApplied.length) {
    out.push({
      title: 'MODIFIED POLICIES',
      kind: 'modified',
      rows: preview.policies.updatedApplied.map(({ instance, manifestTo }) => ({
        key: `pol-mod-${instance.id}`,
        name: manifestTo.name,
        description: manifestTo.description ?? null,
        kind: 'modified' as const,
      })),
    });
  }
  if (preview.tasks.updatedApplied.length) {
    out.push({
      title: 'MODIFIED TASKS',
      kind: 'modified',
      rows: preview.tasks.updatedApplied.map(({ instance, manifestTo }) => ({
        key: `tsk-mod-${instance.id}`,
        name: manifestTo.name,
        description: manifestTo.description,
        kind: 'modified' as const,
      })),
    });
  }

  // Preserved
  const preservedRows: ChangeRow[] = [];
  for (const { instance } of preview.controls.updatedPreserved) {
    preservedRows.push({
      key: `ctl-pres-${instance.id}`,
      name: instance.name,
      description: 'Your edits are kept. Template changed underneath.',
      kind: 'preserved',
    });
  }
  for (const { instance } of preview.tasks.updatedPreserved) {
    preservedRows.push({
      key: `tsk-pres-${instance.id}`,
      name: instance.title,
      description: 'Your edits are kept. Template changed underneath.',
      kind: 'preserved',
    });
  }
  for (const { instance } of preview.policies.updatedPreserved) {
    preservedRows.push({
      key: `pol-pres-${instance.id}`,
      name: instance.name,
      description: 'Your edits are kept. Template changed underneath.',
      kind: 'preserved',
    });
  }
  for (const { instance } of preview.policies.draftAddedForPublished) {
    preservedRows.push({
      key: `pol-draft-${instance.id}`,
      name: instance.name,
      description: 'Published — a new draft version will be created with the template update.',
      kind: 'preserved',
    });
  }
  if (preservedRows.length) {
    out.push({ title: 'YOUR EDITS PRESERVED', kind: 'preserved', rows: preservedRows });
  }

  return out;
}
