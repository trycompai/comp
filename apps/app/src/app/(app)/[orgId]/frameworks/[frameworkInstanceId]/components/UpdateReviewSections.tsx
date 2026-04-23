'use client';

import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Stack,
  Text,
} from '@trycompai/design-system';
import { ChevronDown } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { UpdatePreview } from '@/types/framework-versioning';

interface UpdateReviewSectionsProps {
  preview: UpdatePreview;
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  variant = 'secondary',
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);

  if (count === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Text weight="medium">{title}</Text>
          <Badge variant={variant}>{count}</Badge>
        </div>
        <div
          className="text-muted-foreground transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronDown size={16} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border border-t-0 rounded-b-md px-4 py-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ItemRow({ name, description }: { name: string; description?: string | null }) {
  return (
    <div className="py-2 border-b last:border-b-0">
      <Text size="sm" weight="medium">
        {name}
      </Text>
      {description && (
        <Text size="sm" variant="muted">
          {description}
        </Text>
      )}
    </div>
  );
}

export function UpdateReviewSections({ preview }: UpdateReviewSectionsProps) {
  const controlsAdded = preview.controls.added.length;
  const controlsArchived = preview.controls.archived.length;
  const controlsUpdated = preview.controls.updatedApplied.length;
  const controlsPreserved = preview.controls.updatedPreserved.length;

  const tasksAdded = preview.tasks.added.length;
  const tasksArchived = preview.tasks.archived.length;
  const tasksUpdated = preview.tasks.updatedApplied.length;

  const policiesAdded = preview.policies.added.length;
  const policiesArchived = preview.policies.archived.length;
  const policiesUpdated = preview.policies.updatedApplied.length;
  const policiesDraft = preview.policies.draftAddedForPublished.length;

  const reqAdded = preview.requirements.added.length;
  const reqRemoved = preview.requirements.removed.length;
  const reqUpdated = preview.requirements.updated.length;

  const edges = preview.edges ?? {
    controlPolicy: { added: 0, removed: 0 },
    controlTask: { added: 0, removed: 0 },
    controlRequirement: { added: 0, removed: 0 },
    controlDocumentType: { added: 0, removed: 0 },
  };
  const docTypeEdges = edges.controlDocumentType ?? { added: 0, removed: 0 };
  const edgesTotal =
    edges.controlPolicy.added + edges.controlPolicy.removed +
    edges.controlTask.added + edges.controlTask.removed +
    edges.controlRequirement.added + edges.controlRequirement.removed +
    docTypeEdges.added + docTypeEdges.removed;

  const totalChanges =
    controlsAdded + controlsArchived + controlsUpdated + controlsPreserved +
    tasksAdded + tasksArchived + tasksUpdated +
    policiesAdded + policiesArchived + policiesUpdated + policiesDraft +
    reqAdded + reqRemoved + reqUpdated +
    edgesTotal;

  return (
    <Stack gap="4">
      {preview.releaseNotes && (
        <div className="rounded-md bg-muted/50 px-4 py-3">
          <Text size="sm" weight="medium">
            Release notes
          </Text>
          <Text size="sm" variant="muted">
            {preview.releaseNotes}
          </Text>
        </div>
      )}

      {totalChanges === 0 && (
        <Text variant="muted">No changes detected in this update.</Text>
      )}

      {/* Controls */}
      <CollapsibleSection title="Controls added" count={controlsAdded} variant="default">
        {preview.controls.added.map((c) => (
          <ItemRow key={c.id} name={c.name} description={c.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Controls archived" count={controlsArchived} variant="destructive">
        {preview.controls.archived.map(({ instanceId, manifest }) => (
          <ItemRow key={instanceId} name={manifest.name} description={manifest.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Controls updated" count={controlsUpdated}>
        {preview.controls.updatedApplied.map(({ instance, manifestTo }) => (
          <ItemRow key={instance.id} name={manifestTo.name} description={manifestTo.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Controls with preserved edits"
        count={controlsPreserved}
        variant="outline"
      >
        {preview.controls.updatedPreserved.map(({ instance }) => (
          <ItemRow key={instance.id} name={instance.name} description={instance.description} />
        ))}
      </CollapsibleSection>

      {/* Tasks */}
      <CollapsibleSection title="Tasks added" count={tasksAdded} variant="default">
        {preview.tasks.added.map((t) => (
          <ItemRow key={t.id} name={t.name} description={t.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Tasks archived" count={tasksArchived} variant="destructive">
        {preview.tasks.archived.map(({ instanceId, manifest }) => (
          <ItemRow key={instanceId} name={manifest.name} description={manifest.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Tasks updated" count={tasksUpdated}>
        {preview.tasks.updatedApplied.map(({ instance, manifestTo }) => (
          <ItemRow key={instance.id} name={manifestTo.name} description={manifestTo.description} />
        ))}
      </CollapsibleSection>

      {/* Policies */}
      <CollapsibleSection title="Policies added" count={policiesAdded} variant="default">
        {preview.policies.added.map((p) => (
          <ItemRow key={p.id} name={p.name} description={p.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Policies archived" count={policiesArchived} variant="destructive">
        {preview.policies.archived.map(({ instanceId, manifest }) => (
          <ItemRow key={instanceId} name={manifest.name} description={manifest.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Policies updated" count={policiesUpdated}>
        {preview.policies.updatedApplied.map(({ instance, manifestTo }) => (
          <ItemRow key={instance.id} name={manifestTo.name} description={manifestTo.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection
        title="Policies — draft added for published"
        count={policiesDraft}
        variant="outline"
      >
        {preview.policies.draftAddedForPublished.map(({ instance, manifestTo }) => (
          <ItemRow key={instance.id} name={manifestTo.name} description={manifestTo.description} />
        ))}
      </CollapsibleSection>

      {/* Requirements */}
      <CollapsibleSection title="Requirements added" count={reqAdded} variant="default">
        {preview.requirements.added.map((r) => (
          <ItemRow key={r.id} name={r.name} description={r.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Requirements removed" count={reqRemoved} variant="destructive">
        {preview.requirements.removed.map((r) => (
          <ItemRow key={r.id} name={r.name} description={r.description} />
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Requirements updated" count={reqUpdated}>
        {preview.requirements.updated.map(({ to }) => (
          <ItemRow key={to.id} name={to.name} description={to.description} />
        ))}
      </CollapsibleSection>

      {/* Edge changes (no detail rendering — just counts) */}
      {edgesTotal > 0 && (
        <div className="rounded-md border px-4 py-3">
          <Text weight="medium">Link changes</Text>
          <Stack gap="1" className="mt-1">
            {edges.controlRequirement.added > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlRequirement.added} control → requirement link{edges.controlRequirement.added !== 1 ? 's' : ''} added
              </Text>
            )}
            {edges.controlRequirement.removed > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlRequirement.removed} control → requirement link{edges.controlRequirement.removed !== 1 ? 's' : ''} removed
              </Text>
            )}
            {edges.controlPolicy.added > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlPolicy.added} control → policy link{edges.controlPolicy.added !== 1 ? 's' : ''} added
              </Text>
            )}
            {edges.controlPolicy.removed > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlPolicy.removed} control → policy link{edges.controlPolicy.removed !== 1 ? 's' : ''} removed
              </Text>
            )}
            {edges.controlTask.added > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlTask.added} control → task link{edges.controlTask.added !== 1 ? 's' : ''} added
              </Text>
            )}
            {edges.controlTask.removed > 0 && (
              <Text size="sm" variant="muted">
                {edges.controlTask.removed} control → task link{edges.controlTask.removed !== 1 ? 's' : ''} removed
              </Text>
            )}
            {docTypeEdges.added > 0 && (
              <Text size="sm" variant="muted">
                {docTypeEdges.added} control → document-type link{docTypeEdges.added !== 1 ? 's' : ''} added
              </Text>
            )}
            {docTypeEdges.removed > 0 && (
              <Text size="sm" variant="muted">
                {docTypeEdges.removed} control → document-type link{docTypeEdges.removed !== 1 ? 's' : ''} removed
              </Text>
            )}
          </Stack>
        </div>
      )}
    </Stack>
  );
}
