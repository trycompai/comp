'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Stack,
  Text,
} from '@trycompai/design-system';
import type { UpdatePreview } from '@/types/framework-versioning';

interface SyncConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: UpdatePreview;
  isSyncing: boolean;
  onConfirm: () => void;
}

function countChanges(preview: UpdatePreview): {
  added: number;
  archived: number;
  updated: number;
  linkChanges: number;
} {
  const added =
    preview.controls.added.length +
    preview.tasks.added.length +
    preview.policies.added.length +
    preview.requirements.added.length;

  const archived =
    preview.controls.archived.length +
    preview.tasks.archived.length +
    preview.policies.archived.length +
    preview.requirements.removed.length;

  const updated =
    preview.controls.updatedApplied.length +
    preview.tasks.updatedApplied.length +
    preview.policies.updatedApplied.length +
    preview.requirements.updated.length;

  // Edge-level changes (control↔policy/task/requirement/document-type) are
  // real sync impact too; without this the summary can read "no changes"
  // even though sync will rewire links.
  const linkChanges =
    preview.edges.controlPolicy.added.length +
    preview.edges.controlPolicy.removed.length +
    preview.edges.controlTask.added.length +
    preview.edges.controlTask.removed.length +
    preview.edges.controlRequirement.added.length +
    preview.edges.controlRequirement.removed.length +
    preview.edges.controlDocumentType.added.length +
    preview.edges.controlDocumentType.removed.length;

  return { added, archived, updated, linkChanges };
}

export function SyncConfirmDialog({
  open,
  onOpenChange,
  preview,
  isSyncing,
  onConfirm,
}: SyncConfirmDialogProps) {
  const { added, archived, updated, linkChanges } = countChanges(preview);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Sync to v{preview.toVersion.version}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will apply the following changes to your framework instance.
            This action can be rolled back within the rollback window.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Stack gap="2">
          {added > 0 && (
            <Text size="sm">
              <span className="font-medium">{added}</span> item
              {added !== 1 ? 's' : ''} will be added
            </Text>
          )}
          {archived > 0 && (
            <Text size="sm">
              <span className="font-medium">{archived}</span> item
              {archived !== 1 ? 's' : ''} will be archived
            </Text>
          )}
          {updated > 0 && (
            <Text size="sm">
              <span className="font-medium">{updated}</span> item
              {updated !== 1 ? 's' : ''} will be updated
            </Text>
          )}
          {linkChanges > 0 && (
            <Text size="sm">
              <span className="font-medium">{linkChanges}</span> link
              {linkChanges !== 1 ? 's' : ''} will be rewired
            </Text>
          )}
          {preview.controls.updatedPreserved.length > 0 && (
            <Text size="sm" variant="muted">
              {preview.controls.updatedPreserved.length} control edit
              {preview.controls.updatedPreserved.length !== 1 ? 's' : ''} you
              made will be preserved
            </Text>
          )}
        </Stack>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Confirm sync'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
