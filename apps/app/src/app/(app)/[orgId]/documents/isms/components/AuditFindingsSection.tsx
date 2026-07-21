'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
} from '@trycompai/design-system';
import { Add } from '@trycompai/design-system/icons';
import { useForm } from 'react-hook-form';
import type { IsmsAudit } from '../isms-types';
import { AuditFindingFields } from './AuditFindingFields';
import { AuditFindingRow } from './AuditFindingRow';
import type { ApproverOption } from './IsmsApprovalSection';
import { findingSchema, type FindingFormValues } from './audit-schema';
import { IsmsAddCard } from './shared';

/** Pre-fill for the linked-finding prompt raised from a Controls Tested row. */
export interface FindingPrefill {
  controlId: string;
  controlRef: string;
  type: FindingFormValues['type'];
}

interface AuditFindingsSectionProps {
  audit: IsmsAudit;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  /** When set, the add-finding form opens pre-filled from the raising row. */
  prefill?: FindingPrefill | null;
  onPrefillDismiss?: () => void;
  onCreateFinding: (values: FindingFormValues) => Promise<void>;
  onUpdateFinding: (findingId: string, values: FindingFormValues) => Promise<void>;
  onDeleteFinding: (findingId: string) => Promise<void>;
}

const EMPTY_FINDING: FindingFormValues = {
  type: 'observation',
  controlId: '',
  clauseOrControl: '',
  description: '',
  ownerMemberId: '',
  dueDate: '',
  status: 'open',
  closureEvidence: '',
};

/**
 * The audit's findings, inline below the Controls Tested table. Most findings
 * come from marking a control row "Non-conformity raised" or "Observation
 * raised" and linking back to it; standalone findings are also allowed. An
 * empty table is fine — the generated document renders "No findings raised".
 */
export function AuditFindingsSection({
  audit,
  canEdit,
  memberOptions,
  prefill,
  onPrefillDismiss,
  onCreateFinding,
  onUpdateFinding,
  onDeleteFinding,
}: AuditFindingsSectionProps) {
  return (
    <Stack gap="3">
      <HStack align="center" gap="2">
        <Heading level="5">Findings</Heading>
        <Badge variant="secondary">{String(audit.findings.length)}</Badge>
      </HStack>
      <Text size="sm" variant="muted">
        Raise a finding for every control row marked &quot;Non-conformity raised&quot; or
        &quot;Observation raised&quot;, and link it back to the row. No findings is fine — the
        document renders &quot;No findings raised&quot;.
      </Text>

      {audit.findings.length > 0 ? (
        <Stack gap="3">
          {audit.findings.map((finding) => (
            <AuditFindingRow
              key={finding.id}
              audit={audit}
              finding={finding}
              canEdit={canEdit}
              memberOptions={memberOptions}
              onUpdateFinding={onUpdateFinding}
              onDeleteFinding={onDeleteFinding}
            />
          ))}
        </Stack>
      ) : null}

      {canEdit && prefill ? (
        // The ticket's linked-finding prompt: a row was just marked
        // non-conformity / observation, so the form opens pre-filled from it.
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4">
          <HStack align="center" justify="between" gap="3">
            <Heading level="4">New finding for {prefill.controlRef}</Heading>
            <Button type="button" size="sm" variant="ghost" onClick={onPrefillDismiss}>
              Dismiss
            </Button>
          </HStack>
          <AddFindingForm
            // Keyed by row AND type so re-marking the same row (e.g. from
            // non-conformity to observation) re-initializes the form.
            key={`${prefill.controlId}:${prefill.type}`}
            audit={audit}
            memberOptions={memberOptions}
            initialValues={{
              type: prefill.type,
              controlId: prefill.controlId,
              clauseOrControl: prefill.controlRef,
            }}
            onAdd={onCreateFinding}
            onClose={() => onPrefillDismiss?.()}
          />
        </div>
      ) : canEdit ? (
        <IsmsAddCard addLabel="Add finding" formTitle="New finding">
          {({ close }) => (
            <AddFindingForm
              audit={audit}
              memberOptions={memberOptions}
              onAdd={onCreateFinding}
              onClose={close}
            />
          )}
        </IsmsAddCard>
      ) : null}
    </Stack>
  );
}

function AddFindingForm({
  audit,
  memberOptions,
  initialValues,
  onAdd,
  onClose,
}: {
  audit: IsmsAudit;
  memberOptions: ApproverOption[];
  initialValues?: Partial<FindingFormValues>;
  onAdd: (values: FindingFormValues) => Promise<void>;
  onClose: () => void;
}) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting },
  } = useForm<FindingFormValues>({
    resolver: zodResolver(findingSchema),
    defaultValues: { ...EMPTY_FINDING, ...initialValues },
  });

  const handleAdd = handleSubmit(async (values) => {
    try {
      await onAdd(values);
    } catch {
      // Keep the user's input and the form open when the save fails.
      return;
    }
    reset(EMPTY_FINDING);
    onClose();
  });

  return (
    <form onSubmit={handleAdd} className="flex flex-col gap-3">
      <AuditFindingFields
        control={control}
        controlRows={audit.controls}
        memberOptions={memberOptions}
        onRelatedControlPicked={(row) => {
          // Pre-fill the clause text from the picked row (still editable).
          if (row && !getValues('clauseOrControl')) {
            setValue('clauseOrControl', row.controlRef, { shouldDirty: true });
          }
        }}
      />
      <HStack justify="end">
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting}
          iconLeft={<Add size={16} />}
        >
          Add finding
        </Button>
      </HStack>
    </form>
  );
}
