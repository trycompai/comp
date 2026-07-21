'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Grid,
  Heading,
  HStack,
  Stack,
} from '@trycompai/design-system';
import { Edit, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IsmsAudit, IsmsAuditFinding } from '../isms-types';
import { AuditFindingFields } from './AuditFindingFields';
import type { ApproverOption } from './IsmsApprovalSection';
import { findingSchema, type FindingFormValues } from './audit-schema';
import {
  FINDING_STATUS_LABELS,
  FINDING_TYPE_LABELS,
} from './internal-audit-constants';
import { IsmsRegisterCard, IsmsRegisterField } from './shared';

interface AuditFindingRowProps {
  audit: IsmsAudit;
  finding: IsmsAuditFinding;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  onUpdateFinding: (findingId: string, values: FindingFormValues) => Promise<void>;
  onDeleteFinding: (findingId: string) => Promise<void>;
}

function toFormValues(finding: IsmsAuditFinding): FindingFormValues {
  return {
    type: finding.type,
    controlId: finding.controlId ?? '',
    clauseOrControl: finding.clauseOrControl ?? '',
    description: finding.description,
    ownerMemberId: finding.ownerMemberId ?? '',
    dueDate: finding.dueDate?.slice(0, 10) ?? '',
    status: finding.status,
    closureEvidence: finding.closureEvidence ?? '',
  };
}

/** One finding card: read view with edit mode, delete behind a confirm. */
export function AuditFindingRow({
  audit,
  finding,
  canEdit,
  memberOptions,
  onUpdateFinding,
  onDeleteFinding,
}: AuditFindingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<FindingFormValues>({
    resolver: zodResolver(findingSchema),
    mode: 'onChange',
    defaultValues: toFormValues(finding),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(finding));
  }, [finding, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateFinding(finding.id, values);
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteFinding(finding.id);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsDeleting(false);
    }
  };

  const relatedControl = finding.controlId
    ? audit.controls.find((row) => row.id === finding.controlId)
    : null;
  const ownerName = finding.ownerMemberId
    ? (memberOptions.find((option) => option.id === finding.ownerMemberId)?.name ??
      'Former member')
    : null;

  const headerActions = canEdit ? (
    isEditing ? (
      <HStack align="center" gap="2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset(toFormValues(finding));
            setIsEditing(false);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleSave}
          disabled={!isDirty || !isValid || isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </HStack>
    ) : (
      <HStack align="center" gap="1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          iconLeft={<Edit size={16} />}
          aria-label={`Edit finding ${finding.reference}`}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={<TrashCan size={16} />}
          aria-label={`Delete finding ${finding.reference}`}
        />
      </HStack>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <HStack align="center" gap="2">
          <Heading level="5">{finding.reference}</Heading>
          <Badge variant="secondary">{FINDING_TYPE_LABELS[finding.type]}</Badge>
          <Badge variant={finding.status === 'closed' ? 'default' : 'outline'}>
            {FINDING_STATUS_LABELS[finding.status]}
          </Badge>
        </HStack>
      }
      headerEnd={headerActions}
    >
      {isEditing ? (
        <AuditFindingFields
          control={control}
          controlRows={audit.controls}
          memberOptions={memberOptions}
        />
      ) : (
        <Stack gap="3">
          <IsmsRegisterField label="Description">{finding.description}</IsmsRegisterField>
          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsRegisterField label="Clause or control">
              {finding.clauseOrControl || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Related control">
              {relatedControl?.controlRef ?? '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Owner">{ownerName ?? 'Unassigned'}</IsmsRegisterField>
            <IsmsRegisterField label="Due date">
              {finding.dueDate?.slice(0, 10) ?? '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Closure evidence">
              {finding.closureEvidence || '—'}
            </IsmsRegisterField>
          </Grid>
        </Stack>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete finding {finding.reference}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the finding and its closure trail. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </IsmsRegisterCard>
  );
}
