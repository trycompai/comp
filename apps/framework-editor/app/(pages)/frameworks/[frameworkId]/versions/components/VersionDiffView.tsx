'use client';

import type {
  DiffControl,
  DiffPolicy,
  DiffRequirement,
  DiffTask,
  DraftDiff,
} from '../hooks/useFrameworkDraftDiff';

/**
 * Entity + link changes between two manifests. Identical shape for
 * publish-time (draft vs latest published) and historical (v_n vs v_n-1)
 * diffs, so this component powers both the PublishVersionDialog and the
 * historical version-detail page.
 */
export interface VersionDiffViewProps {
  diff: DraftDiff['diff'];
  linkChanges: DraftDiff['linkChanges'];
}

export function hasAnyChanges(diff: DraftDiff['diff']): boolean {
  const {
    controls,
    requirements,
    policies,
    tasks,
    requirementMapEdges,
    controlPolicyEdges,
    controlTaskEdges,
    controlDocumentTypeEdges,
  } = diff;
  const docTypeEdges = controlDocumentTypeEdges ?? { added: [], removed: [] };
  return (
    (diff.framework?.changed ?? false) ||
    controls.added.length > 0 ||
    controls.removed.length > 0 ||
    controls.updated.length > 0 ||
    requirements.added.length > 0 ||
    requirements.removed.length > 0 ||
    requirements.updated.length > 0 ||
    policies.added.length > 0 ||
    policies.removed.length > 0 ||
    policies.updated.length > 0 ||
    tasks.added.length > 0 ||
    tasks.removed.length > 0 ||
    tasks.updated.length > 0 ||
    requirementMapEdges.added.length > 0 ||
    requirementMapEdges.removed.length > 0 ||
    controlPolicyEdges.added.length > 0 ||
    controlPolicyEdges.removed.length > 0 ||
    controlTaskEdges.added.length > 0 ||
    controlTaskEdges.removed.length > 0 ||
    docTypeEdges.added.length > 0 ||
    docTypeEdges.removed.length > 0
  );
}

export function VersionDiffView({ diff, linkChanges }: VersionDiffViewProps) {
  return (
    <>
      <FrameworkMetaSection framework={diff.framework} />
      <DiffDetailSection
        title="Requirements"
        added={diff.requirements.added}
        removed={diff.requirements.removed}
        updated={diff.requirements.updated}
        renderRow={(r: DiffRequirement) => (
          <span>
            <span className="font-mono text-muted-foreground mr-2">{r.identifier}</span>
            {r.name}
          </span>
        )}
        renderUpdatedRow={(u) => (
          <span>
            <span className="font-mono text-muted-foreground mr-2">{u.to.identifier}</span>
            {u.to.name}
            <RequirementChangeDetail from={u.from} to={u.to} />
          </span>
        )}
      />
      <DiffDetailSection
        title="Controls"
        added={diff.controls.added}
        removed={diff.controls.removed}
        updated={diff.controls.updated}
        renderRow={(c: DiffControl) => <span>{c.name}</span>}
        renderUpdatedRow={(u) => (
          <span>
            {u.to.name}
            <ControlChangeDetail from={u.from} to={u.to} />
          </span>
        )}
      />
      <DiffDetailSection
        title="Policies"
        added={diff.policies.added}
        removed={diff.policies.removed}
        updated={diff.policies.updated}
        renderRow={(p: DiffPolicy) => <span>{p.name}</span>}
      />
      <DiffDetailSection
        title="Tasks"
        added={diff.tasks.added}
        removed={diff.tasks.removed}
        updated={diff.tasks.updated}
        renderRow={(t: DiffTask) => <span>{t.name}</span>}
      />
      <LinkEdgeSection
        title="Control → requirement links"
        added={(linkChanges?.controlRequirement.added ?? []).map((e, i) => ({
          key: `a-${i}`,
          left: e.controlName,
          right: e.requirementIdentifier
            ? `${e.requirementIdentifier} — ${e.requirementName}`
            : e.requirementName,
        }))}
        removed={(linkChanges?.controlRequirement.removed ?? []).map((e, i) => ({
          key: `r-${i}`,
          left: e.controlName,
          right: e.requirementIdentifier
            ? `${e.requirementIdentifier} — ${e.requirementName}`
            : e.requirementName,
        }))}
        fallbackAdded={diff.requirementMapEdges.added.length}
        fallbackRemoved={diff.requirementMapEdges.removed.length}
      />
      <LinkEdgeSection
        title="Control → policy links"
        added={(linkChanges?.controlPolicy.added ?? []).map((e, i) => ({
          key: `a-${i}`,
          left: e.controlName,
          right: e.policyName,
        }))}
        removed={(linkChanges?.controlPolicy.removed ?? []).map((e, i) => ({
          key: `r-${i}`,
          left: e.controlName,
          right: e.policyName,
        }))}
        fallbackAdded={diff.controlPolicyEdges.added.length}
        fallbackRemoved={diff.controlPolicyEdges.removed.length}
      />
      <LinkEdgeSection
        title="Control → task links"
        added={(linkChanges?.controlTask.added ?? []).map((e, i) => ({
          key: `a-${i}`,
          left: e.controlName,
          right: e.taskName,
        }))}
        removed={(linkChanges?.controlTask.removed ?? []).map((e, i) => ({
          key: `r-${i}`,
          left: e.controlName,
          right: e.taskName,
        }))}
        fallbackAdded={diff.controlTaskEdges.added.length}
        fallbackRemoved={diff.controlTaskEdges.removed.length}
      />
      <LinkEdgeSection
        title="Control → document-type links"
        added={(linkChanges?.controlDocumentType.added ?? []).map((e, i) => ({
          key: `a-${i}`,
          left: e.controlName,
          right: e.formType.replace(/_/g, ' '),
        }))}
        removed={(linkChanges?.controlDocumentType.removed ?? []).map((e, i) => ({
          key: `r-${i}`,
          left: e.controlName,
          right: e.formType.replace(/_/g, ' '),
        }))}
        fallbackAdded={diff.controlDocumentTypeEdges?.added.length ?? 0}
        fallbackRemoved={diff.controlDocumentTypeEdges?.removed.length ?? 0}
      />
    </>
  );
}

function FrameworkMetaSection({
  framework,
}: {
  framework: DraftDiff['diff']['framework'];
}) {
  if (!framework?.changed) return null;
  return (
    <div className="border-b last:border-b-0 px-4 py-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        Framework
      </p>
      <div className="flex flex-col gap-1">
        {framework.name && (
          <DiffRow kind="modified">
            <span>
              Name:{' '}
              <span className="text-muted-foreground line-through">{framework.name.from}</span>{' '}
              → <span className="font-medium">{framework.name.to}</span>
            </span>
          </DiffRow>
        )}
        {framework.description && (
          <DiffRow kind="modified">
            <span>Description updated</span>
          </DiffRow>
        )}
      </div>
    </div>
  );
}

interface DiffDetailSectionProps<T extends { id: string }> {
  title: string;
  added: T[];
  removed: T[];
  updated: Array<{ id: string; from: T; to: T }>;
  renderRow: (item: T) => React.ReactNode;
  renderUpdatedRow?: (u: { id: string; from: T; to: T }) => React.ReactNode;
}

function DiffDetailSection<T extends { id: string }>({
  title,
  added,
  removed,
  updated,
  renderRow,
  renderUpdatedRow,
}: DiffDetailSectionProps<T>) {
  if (added.length === 0 && removed.length === 0 && updated.length === 0) return null;
  return (
    <div className="border-b last:border-b-0 px-4 py-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {added.map((item) => (
          <DiffRow key={`a-${item.id}`} kind="added">
            {renderRow(item)}
          </DiffRow>
        ))}
        {removed.map((item) => (
          <DiffRow key={`r-${item.id}`} kind="removed">
            {renderRow(item)}
          </DiffRow>
        ))}
        {updated.map((u) => (
          <DiffRow key={`u-${u.id}`} kind="modified">
            {renderUpdatedRow ? renderUpdatedRow(u) : renderRow(u.to)}
          </DiffRow>
        ))}
      </div>
    </div>
  );
}

function ControlChangeDetail({ from, to }: { from: DiffControl; to: DiffControl }) {
  const changes: string[] = [];
  if (from.name !== to.name) changes.push('name');
  if (from.description !== to.description) changes.push('description');
  const fromFamily = from.controlFamily ?? null;
  const toFamily = to.controlFamily ?? null;
  if (fromFamily !== toFamily) {
    if (!fromFamily && toFamily) {
      changes.push(`family set to "${toFamily}"`);
    } else if (fromFamily && !toFamily) {
      changes.push('family removed');
    } else {
      changes.push(`family: "${fromFamily}" → "${toFamily}"`);
    }
  }
  if (changes.length === 0) return null;
  return (
    <span className="text-muted-foreground ml-2 text-xs">
      ({changes.join(', ')})
    </span>
  );
}

function RequirementChangeDetail({ from, to }: { from: DiffRequirement; to: DiffRequirement }) {
  const changes: string[] = [];
  if (from.name !== to.name) changes.push('name');
  if (from.identifier !== to.identifier) changes.push('identifier');
  if (from.description !== to.description) changes.push('description');
  const fromFamily = from.requirementFamily ?? null;
  const toFamily = to.requirementFamily ?? null;
  if (fromFamily !== toFamily) {
    if (!fromFamily && toFamily) {
      changes.push(`family set to "${toFamily}"`);
    } else if (fromFamily && !toFamily) {
      changes.push('family removed');
    } else {
      changes.push(`family: "${fromFamily}" → "${toFamily}"`);
    }
  }
  if (changes.length === 0) return null;
  return (
    <span className="text-muted-foreground ml-2 text-xs">
      ({changes.join(', ')})
    </span>
  );
}

function DiffRow({
  kind,
  children,
}: {
  kind: 'added' | 'removed' | 'modified';
  children: React.ReactNode;
}) {
  const markerClass =
    kind === 'added'
      ? 'bg-green-100 text-green-700'
      : kind === 'removed'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-700';
  const marker = kind === 'added' ? '+' : kind === 'removed' ? '−' : '~';
  const label = kind.charAt(0).toUpperCase() + kind.slice(1);
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold ${markerClass}`}
        >
          {marker}
        </span>
        <span className="text-sm">{children}</span>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
    </div>
  );
}

interface LinkEntry {
  key: string;
  left: string;
  right: string;
}

function LinkEdgeSection({
  title,
  added,
  removed,
  fallbackAdded,
  fallbackRemoved,
}: {
  title: string;
  added: LinkEntry[];
  removed: LinkEntry[];
  fallbackAdded: number;
  fallbackRemoved: number;
}) {
  const totalDetailed = added.length + removed.length;
  const totalFallback = fallbackAdded + fallbackRemoved;
  if (totalDetailed === 0 && totalFallback === 0) return null;

  // If the enriched linkChanges payload is missing (older API), just show counts.
  if (totalDetailed === 0 && totalFallback > 0) {
    return (
      <div className="border-b last:border-b-0 px-4 py-3">
        <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">
          {title}
        </p>
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          {fallbackAdded > 0 && (
            <span>
              {fallbackAdded} link{fallbackAdded !== 1 ? 's' : ''} added
            </span>
          )}
          {fallbackRemoved > 0 && (
            <span>
              {fallbackRemoved} link{fallbackRemoved !== 1 ? 's' : ''} removed
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-b last:border-b-0 px-4 py-3">
      <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        {title}
      </p>
      <div className="flex flex-col gap-1">
        {added.map((e) => (
          <LinkRow key={`a-${e.key}`} kind="added" entry={e} />
        ))}
        {removed.map((e) => (
          <LinkRow key={`r-${e.key}`} kind="removed" entry={e} />
        ))}
      </div>
    </div>
  );
}

function LinkRow({ kind, entry }: { kind: 'added' | 'removed'; entry: LinkEntry }) {
  const markerClass =
    kind === 'added' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const marker = kind === 'added' ? '+' : '−';
  const label = kind === 'added' ? 'Added' : 'Removed';
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold ${markerClass}`}
        >
          {marker}
        </span>
        <span className="text-sm">
          <span className="font-medium">{entry.left}</span>
          <span className="text-muted-foreground mx-1">→</span>
          <span className="font-medium">{entry.right}</span>
        </span>
      </div>
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
    </div>
  );
}
