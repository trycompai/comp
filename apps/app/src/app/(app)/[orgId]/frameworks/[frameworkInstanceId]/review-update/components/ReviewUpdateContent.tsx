'use client';

import {
  Badge,
  Button,
  Stack,
  Tabs,
  TabsList,
  TabsTrigger,
  Text,
} from '@trycompai/design-system';
import { ArrowLeft, CheckmarkOutline } from '@trycompai/design-system/icons';
import Link from 'next/link';
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

function formatPublished(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

  // Build flat, grouped change rows.
  const groups = useMemo<ChangeGroup[]>(() => {
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

    // Modified (content updates applied)
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

    // Preserved (customer edits kept)
    const preservedControls = preview.controls.updatedPreserved;
    const preservedTasks = preview.tasks.updatedPreserved;
    const preservedPolicies = preview.policies.updatedPreserved;
    const draftPolicies = preview.policies.draftAddedForPublished;
    if (preservedControls.length || preservedTasks.length || preservedPolicies.length || draftPolicies.length) {
      const rows: ChangeRow[] = [];
      for (const { instance } of preservedControls) {
        rows.push({
          key: `ctl-pres-${instance.id}`,
          name: instance.name,
          description: 'Your edits will be kept. Template changed underneath.',
          kind: 'preserved',
        });
      }
      for (const { instance } of preservedTasks) {
        rows.push({
          key: `tsk-pres-${instance.id}`,
          name: instance.title,
          description: 'Your edits will be kept. Template changed underneath.',
          kind: 'preserved',
        });
      }
      for (const { instance } of preservedPolicies) {
        rows.push({
          key: `pol-pres-${instance.id}`,
          name: instance.name,
          description: 'Your edits will be kept. Template changed underneath.',
          kind: 'preserved',
        });
      }
      for (const { instance } of draftPolicies) {
        rows.push({
          key: `pol-draft-${instance.id}`,
          name: instance.name,
          description: 'Published — a new draft version will be created with the template update.',
          kind: 'preserved',
        });
      }
      if (rows.length) {
        out.push({ title: 'YOUR EDITS PRESERVED', kind: 'preserved', rows });
      }
    }

    return out;
  }, [preview]);

  // Summary counts
  const addedCount =
    preview.controls.added.length +
    preview.policies.added.length +
    preview.tasks.added.length +
    preview.requirements.added.length;
  const removedCount =
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
  const edgesTotal =
    (preview.edges?.controlPolicy.added ?? 0) +
    (preview.edges?.controlPolicy.removed ?? 0) +
    (preview.edges?.controlTask.added ?? 0) +
    (preview.edges?.controlTask.removed ?? 0) +
    (preview.edges?.controlRequirement.added ?? 0) +
    (preview.edges?.controlRequirement.removed ?? 0) +
    (preview.edges?.controlDocumentType?.added ?? 0) +
    (preview.edges?.controlDocumentType?.removed ?? 0);
  const totalChanges = addedCount + removedCount + modifiedCount + preservedCount;

  const visibleGroups = useMemo(() => {
    if (filter === 'all') return groups;
    return groups.filter((g) => {
      if (filter === 'added') return g.kind === 'added';
      if (filter === 'removed') return g.kind === 'removed';
      if (filter === 'modified') return g.kind === 'modified' || g.kind === 'preserved';
      return true;
    });
  }, [groups, filter]);

  async function handleApply() {
    if (!preview.toVersion.id) return;
    try {
      await sync(preview.toVersion.id);
      toast.success(`Synced to v${preview.toVersion.version}`);
      router.push(frameworkHref);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to apply update',
      );
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <Stack gap="lg" className="pb-24">
      {/* Top row: back link + version change */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={frameworkHref}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back to {frameworkName}
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Text size="sm" variant="muted">
            Reviewing update
          </Text>
          <Badge variant="outline">v{preview.fromVersion.version}</Badge>
          <Text size="sm" variant="muted">
            →
          </Text>
          <Badge variant="secondary">v{preview.toVersion.version}</Badge>
        </div>
      </div>

      {/* Title block */}
      <Stack gap="2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border px-3 py-0.5">
            <span className="size-2 rounded-full bg-blue-500" />
            <Text size="xs" weight="medium">
              UPDATE AVAILABLE
            </Text>
          </div>
          <Text size="sm" variant="muted">
            Published {formatPublished(preview.releaseNotes ? null : null) /* TODO: wire publishedAt */}
          </Text>
        </div>
        <Text size="xl" weight="semibold">
          {frameworkName} v{preview.toVersion.version} — {totalChanges} change
          {totalChanges !== 1 ? 's' : ''}
        </Text>
        {preview.releaseNotes && (
          <Text variant="muted">{preview.releaseNotes}</Text>
        )}
      </Stack>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="NEW" value={addedCount} />
        <StatCard label="REMOVED" value={removedCount} tone="danger" />
        <StatCard label="MODIFIED" value={modifiedCount} />
        <StatCard
          label="LINKS AFFECTED"
          value={edgesTotal}
          caption={edgesTotal === 0 ? 'No link changes' : undefined}
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
        <TabsList variant="underline">
          <TabsTrigger value="all">
            All changes <TabBadge count={totalChanges} />
          </TabsTrigger>
          <TabsTrigger value="added">
            Added <TabBadge count={addedCount} />
          </TabsTrigger>
          <TabsTrigger value="removed">
            Removed <TabBadge count={removedCount} />
          </TabsTrigger>
          <TabsTrigger value="modified">
            Modified <TabBadge count={modifiedCount + preservedCount} />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grouped change rows */}
      {visibleGroups.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center">
          <Text variant="muted">No changes in this category.</Text>
        </div>
      ) : (
        <Stack gap="lg">
          {visibleGroups.map((group) => (
            <Stack key={group.title} gap="2">
              <div className="flex items-center justify-between border-b pb-1">
                <Text size="xs" weight="medium" variant="muted">
                  {group.title}
                </Text>
                <Text size="xs" variant="muted">
                  {group.rows.length}
                </Text>
              </div>
              <Stack gap="1">
                {group.rows.map((row) => (
                  <ItemRow key={row.key} row={row} />
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      )}

      {/* Sticky apply bar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-6 py-3">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
          <Text size="sm" variant="muted">
            Apply will update your framework instance. You can roll back within 14 days.
          </Text>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push(frameworkHref)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!canApply || isSyncing || !preview.toVersion.id || totalChanges === 0}
              onClick={() => setConfirmOpen(true)}
            >
              <CheckmarkOutline size={16} />
              {isSyncing ? 'Applying...' : `Apply ${totalChanges} change${totalChanges !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
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
  caption,
}: {
  label: string;
  value: number;
  tone?: 'danger';
  caption?: string;
}) {
  return (
    <div className="rounded-md border px-4 py-3">
      <Text
        size="xl"
        weight="semibold"
        className={tone === 'danger' && value > 0 ? 'text-destructive' : undefined}
      >
        {value}
      </Text>
      <Text size="xs" variant="muted" weight="medium">
        {label}
      </Text>
      {caption && (
        <Text size="xs" variant="muted">
          {caption}
        </Text>
      )}
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
      ? { label: 'ADDED', variant: 'default' as const }
      : row.kind === 'removed'
        ? { label: 'REMOVED', variant: 'destructive' as const }
        : row.kind === 'modified'
          ? { label: 'MODIFIED', variant: 'secondary' as const }
          : { label: 'PRESERVED', variant: 'outline' as const };
  const marker =
    row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : '~';

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm text-xs font-medium"
          style={{
            backgroundColor:
              row.kind === 'added'
                ? 'rgb(220 252 231)'
                : row.kind === 'removed'
                  ? 'rgb(254 226 226)'
                  : 'rgb(226 232 240)',
            color:
              row.kind === 'added'
                ? 'rgb(21 128 61)'
                : row.kind === 'removed'
                  ? 'rgb(185 28 28)'
                  : 'rgb(71 85 105)',
          }}
        >
          {marker}
        </span>
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {row.identifier && (
              <Text
                size="sm"
                weight="medium"
                className="font-mono text-muted-foreground"
              >
                {row.identifier}
              </Text>
            )}
            <Text size="sm" weight="medium">
              {row.name}
            </Text>
          </div>
          {row.description && (
            <Text size="sm" variant="muted">
              {row.description}
            </Text>
          )}
        </div>
      </div>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  );
}
