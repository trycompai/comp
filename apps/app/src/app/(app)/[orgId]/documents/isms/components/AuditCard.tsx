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
import type { IsmsAudit } from '../isms-types';
import { AuditControlsTable } from './AuditControlsTable';
import { AuditFields } from './AuditFields';
import { AuditFindingsSection } from './AuditFindingsSection';
import { AuditSignoffCard } from './AuditSignoffCard';
import type { ApproverOption } from './IsmsApprovalSection';
import {
  auditDetailsSchema,
  type AuditControlFormValues,
  type AuditDetailsFormValues,
  type FindingFormValues,
  type SignoffFormValues,
} from './audit-schema';
import {
  AUDIT_STATUS_LABELS,
  conclusionSentence,
} from './internal-audit-constants';
import { IsmsRegisterCard, IsmsRegisterField } from './shared';

/** All mutations an audit card (and its child sections) can perform. */
export interface AuditHandlers {
  onUpdateAudit: (auditId: string, values: AuditDetailsFormValues) => Promise<void>;
  onDeleteAudit: (auditId: string) => Promise<void>;
  onSaveSignoff: (auditId: string, values: SignoffFormValues) => Promise<void>;
  onCreateControl: (auditId: string, values: AuditControlFormValues) => Promise<void>;
  onUpdateControl: (controlId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteControl: (controlId: string) => Promise<void>;
  onCreateFinding: (auditId: string, values: FindingFormValues) => Promise<void>;
  onUpdateFinding: (findingId: string, values: FindingFormValues) => Promise<void>;
  onDeleteFinding: (findingId: string) => Promise<void>;
}

interface AuditCardProps extends AuditHandlers {
  audit: IsmsAudit;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  auditorOptions: string[];
}

function toFormValues(audit: IsmsAudit): AuditDetailsFormValues {
  return {
    scope: audit.scope,
    criteria: audit.criteria,
    auditorName: audit.auditorName ?? '',
    plannedStartDate: audit.plannedStartDate?.slice(0, 10) ?? '',
    plannedEndDate: audit.plannedEndDate?.slice(0, 10) ?? '',
    status: audit.status,
    conclusionVerdict: audit.conclusionVerdict ?? '',
    conclusionNotes: audit.conclusionNotes ?? '',
  };
}

export function AuditCard({
  audit,
  canEdit,
  memberOptions,
  auditorOptions,
  onUpdateAudit,
  onDeleteAudit,
  onSaveSignoff,
  onCreateControl,
  onUpdateControl,
  onDeleteControl,
  onCreateFinding,
  onUpdateFinding,
  onDeleteFinding,
}: AuditCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<AuditDetailsFormValues>({
    resolver: zodResolver(auditDetailsSchema),
    mode: 'onChange',
    defaultValues: toFormValues(audit),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(audit));
  }, [audit, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateAudit(audit.id, values);
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteAudit(audit.id);
    } catch {
      // Error already surfaced via toast by the caller.
    } finally {
      setIsDeleting(false);
    }
  };

  const headerActions = canEdit ? (
    isEditing ? (
      <HStack align="center" gap="2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset(toFormValues(audit));
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
          aria-label={`Edit audit ${audit.reference}`}
        >
          Edit details
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
          loading={isDeleting}
          iconLeft={<TrashCan size={16} />}
          aria-label={`Delete audit ${audit.reference}`}
        />
      </HStack>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <HStack align="center" gap="2">
          <Heading level="4">{audit.reference}</Heading>
          <Badge variant="secondary">{AUDIT_STATUS_LABELS[audit.status]}</Badge>
        </HStack>
      }
      headerEnd={headerActions}
    >
      {isEditing ? (
        <AuditFields control={control} auditorOptions={auditorOptions} />
      ) : (
        <Stack gap="6">
          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsRegisterField label="Scope">{audit.scope || '—'}</IsmsRegisterField>
            <IsmsRegisterField label="Criteria">{audit.criteria || '—'}</IsmsRegisterField>
            <IsmsRegisterField label="Auditor">
              {audit.auditorName || 'Not set — assigned in ISMS > Roles'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Planned dates">
              {audit.plannedStartDate || audit.plannedEndDate
                ? `${audit.plannedStartDate?.slice(0, 10) ?? '—'} to ${audit.plannedEndDate?.slice(0, 10) ?? '—'}`
                : '—'}
            </IsmsRegisterField>
          </Grid>
          <IsmsRegisterField label="Conclusion">
            {audit.conclusionVerdict
              ? `${conclusionSentence(audit.conclusionVerdict)}${audit.conclusionNotes ? ` ${audit.conclusionNotes}` : ''}`
              : 'No conclusion recorded yet — pick the verdict in Edit details.'}
          </IsmsRegisterField>

          <AuditControlsTable
            audit={audit}
            canEdit={canEdit}
            onCreateControl={(values) => onCreateControl(audit.id, values)}
            onUpdateControl={onUpdateControl}
            onDeleteControl={onDeleteControl}
          />

          <AuditFindingsSection
            audit={audit}
            canEdit={canEdit}
            memberOptions={memberOptions}
            onCreateFinding={(values) => onCreateFinding(audit.id, values)}
            onUpdateFinding={onUpdateFinding}
            onDeleteFinding={onDeleteFinding}
          />

          <AuditSignoffCard
            audit={audit}
            canEdit={canEdit}
            onSave={(values) => onSaveSignoff(audit.id, values)}
          />
        </Stack>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete audit {audit.reference}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the audit, its Controls Tested rows, and its findings. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </IsmsRegisterCard>
  );
}
