'use client';

import {
  Badge,
  Field,
  Grid,
  HStack,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { IsmsRoleAssignment } from '../isms-types';
import {
  COMPETENCE_BASIS_LABELS,
  COMPETENCE_BASIS_OPTIONS,
} from './roles-constants';
import { IsmsCardActions, IsmsFieldLabel, IsmsRegisterField } from './shared';

/** The competence payload sent to the assignment update endpoint. */
export interface AssignmentCompetenceUpdate {
  basisOfCompetence: string | null;
  evidenceRetained: string | null;
  gap: string | null;
  remediationAction: string | null;
  remediationDueDate: string | null;
}

interface CompetenceFormValues {
  basisOfCompetence: string;
  evidenceRetained: string;
  gap: string;
  remediationAction: string;
  remediationDueDate: string;
}

interface RoleAssignmentRowProps {
  assignment: IsmsRoleAssignment;
  memberName: string;
  canEdit: boolean;
  onUpdate: (update: AssignmentCompetenceUpdate) => Promise<void>;
  onRemove: () => Promise<void>;
}

function toFormValues(assignment: IsmsRoleAssignment): CompetenceFormValues {
  return {
    basisOfCompetence: assignment.basisOfCompetence ?? '',
    evidenceRetained: assignment.evidenceRetained ?? '',
    gap: assignment.gap ?? '',
    remediationAction: assignment.remediationAction ?? '',
    remediationDueDate: assignment.remediationDueDate?.slice(0, 10) ?? '',
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function RoleAssignmentRow({
  assignment,
  memberName,
  canEdit,
  onUpdate,
  onRemove,
}: RoleAssignmentRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<CompetenceFormValues>({
    defaultValues: toFormValues(assignment),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(assignment));
  }, [assignment, isEditing, reset]);

  const gapValue = useWatch({ control, name: 'gap' });
  const hasGap = !!gapValue?.trim();

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdate({
        basisOfCompetence: values.basisOfCompetence || null,
        evidenceRetained: emptyToNull(values.evidenceRetained),
        gap: emptyToNull(values.gap),
        // Remediation only applies when a gap is recorded.
        remediationAction: values.gap.trim()
          ? emptyToNull(values.remediationAction)
          : null,
        remediationDueDate: values.gap.trim()
          ? emptyToNull(values.remediationDueDate)
          : null,
      });
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onRemove();
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = canEdit ? (
    <IsmsCardActions
      isEditing={isEditing}
      onEdit={() => {
        reset(toFormValues(assignment));
        setIsEditing(true);
      }}
      onSave={handleSave}
      onCancel={() => {
        reset(toFormValues(assignment));
        setIsEditing(false);
      }}
      onDelete={handleDelete}
      isDirty={isDirty}
      isSaving={isSubmitting}
      isDeleting={isDeleting}
      editLabel={`Edit competence for ${memberName}`}
      deleteLabel={`Remove ${memberName}`}
    />
  ) : undefined;

  const header = (
    <HStack align="center" gap="2" wrap="wrap">
      <Text size="sm" weight="medium">
        {memberName}
      </Text>
      {assignment.gap ? <Badge variant="destructive">Gap</Badge> : null}
    </HStack>
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-background p-3">
      <HStack align="start" justify="between" gap="3" wrap="wrap">
        {header}
        {actions ? <div className="ml-auto shrink-0">{actions}</div> : null}
      </HStack>

      {isEditing ? (
        <Stack gap="3">
          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsFieldLabel label="Basis of competence">
              <Controller
                control={control}
                name="basisOfCompetence"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger aria-label="Basis of competence">
                      <SelectValue placeholder="Select a basis" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPETENCE_BASIS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </IsmsFieldLabel>
            <IsmsFieldLabel label="Evidence retained">
              <Field>
                <Controller
                  control={control}
                  name="evidenceRetained"
                  render={({ field: { ref: _ref, ...field } }) => (
                    <Input
                      {...field}
                      placeholder="e.g. CV, certificate, training record"
                      aria-label="Evidence retained"
                    />
                  )}
                />
              </Field>
            </IsmsFieldLabel>
          </Grid>
          <IsmsFieldLabel label="Gap (optional)">
            <Field>
              <Controller
                control={control}
                name="gap"
                render={({ field: { ref: _ref, ...field } }) => (
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Describe any competence gap"
                    aria-label="Competence gap"
                  />
                )}
              />
            </Field>
          </IsmsFieldLabel>
          {hasGap ? (
            <Grid cols={{ base: '1', md: '2' }} gap="3">
              <IsmsFieldLabel label="Remediation action">
                <Field>
                  <Controller
                    control={control}
                    name="remediationAction"
                    render={({ field: { ref: _ref, ...field } }) => (
                      <Input
                        {...field}
                        placeholder="Planned action to close the gap"
                        aria-label="Remediation action"
                      />
                    )}
                  />
                </Field>
              </IsmsFieldLabel>
              <IsmsFieldLabel label="Remediation due date">
                <Field>
                  <Controller
                    control={control}
                    name="remediationDueDate"
                    render={({ field: { ref: _ref, ...field } }) => (
                      <Input
                        {...field}
                        type="date"
                        aria-label="Remediation due date"
                      />
                    )}
                  />
                </Field>
              </IsmsFieldLabel>
            </Grid>
          ) : null}
        </Stack>
      ) : (
        <Grid cols={{ base: '1', md: '2' }} gap="3">
          <IsmsRegisterField label="Basis of competence">
            {assignment.basisOfCompetence
              ? COMPETENCE_BASIS_LABELS[assignment.basisOfCompetence]
              : '—'}
          </IsmsRegisterField>
          <IsmsRegisterField label="Evidence retained">
            {assignment.evidenceRetained ?? '—'}
          </IsmsRegisterField>
          {assignment.gap ? (
            <>
              <IsmsRegisterField label="Gap">{assignment.gap}</IsmsRegisterField>
              <IsmsRegisterField label="Remediation">
                {assignment.remediationAction ?? '—'}
                {assignment.remediationDueDate
                  ? ` (due ${assignment.remediationDueDate.slice(0, 10)})`
                  : ''}
              </IsmsRegisterField>
            </>
          ) : null}
        </Grid>
      )}
    </div>
  );
}
