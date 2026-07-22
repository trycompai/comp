'use client';

import {
  Field,
  FieldError,
  Grid,
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
import { Controller, useWatch, type Control } from 'react-hook-form';
import type { IsmsAuditControl } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import type { FindingFormValues } from './audit-schema';
import {
  FINDING_DESCRIPTION_PLACEHOLDER,
  FINDING_STATUSES,
  FINDING_STATUS_LABELS,
  FINDING_TYPES,
  FINDING_TYPE_DESCRIPTIONS,
  FINDING_TYPE_LABELS,
} from './internal-audit-constants';
import { IsmsFieldLabel } from './shared';

const NONE = 'none';

interface AuditFindingFieldsProps {
  control: Control<FindingFormValues>;
  /** The audit's Controls Tested rows, for the optional related-control link. */
  controlRows: IsmsAuditControl[];
  memberOptions: ApproverOption[];
  /** Pre-fill "Clause or control" from the picked related control row. */
  onRelatedControlPicked?: (row: IsmsAuditControl | null) => void;
}

/** Shared RHF fields for adding and editing a finding (clause 9.2). */
export function AuditFindingFields({
  control,
  controlRows,
  memberOptions,
  onRelatedControlPicked,
}: AuditFindingFieldsProps) {
  const selectedType = useWatch({ control, name: 'type' });

  return (
    <Stack gap="3">
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Type">
          <Stack gap="1">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Finding type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINDING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {FINDING_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {selectedType ? (
              <Text size="xs" variant="muted">
                {FINDING_TYPE_DESCRIPTIONS[selectedType]}
              </Text>
            ) : null}
          </Stack>
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Related control (optional)">
          <Controller
            control={control}
            name="controlId"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(next) => {
                  const controlId = next === NONE ? '' : next;
                  field.onChange(controlId);
                  onRelatedControlPicked?.(
                    controlRows.find((row) => row.id === controlId) ?? null,
                  );
                }}
              >
                <SelectTrigger aria-label="Related control">
                  <SelectValue placeholder="None (standalone finding)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None (standalone finding)</SelectItem>
                  {controlRows.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.controlRef}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Clause or control">
          <Controller
            control={control}
            name="clauseOrControl"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input
                {...field}
                aria-label="Clause or control"
                placeholder="e.g. Clause 9.1 (Monitoring)"
              />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Owner">
          <Controller
            control={control}
            name="ownerMemberId"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(next) => field.onChange(next === NONE ? '' : next)}
              >
                <SelectTrigger aria-label="Finding owner">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {memberOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Due date">
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { ref: _ref, ...field } }) => (
              <Input {...field} type="date" aria-label="Finding due date" />
            )}
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Finding status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FINDING_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {FINDING_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </IsmsFieldLabel>
      </Grid>
      <IsmsFieldLabel label="Description">
        <Field>
          <Controller
            control={control}
            name="description"
            render={({ field: { ref: _ref, ...field }, fieldState }) => (
              <>
                <Textarea
                  {...field}
                  rows={3}
                  aria-label="Finding description"
                  placeholder={FINDING_DESCRIPTION_PLACEHOLDER}
                />
                <FieldError>{fieldState.error?.message}</FieldError>
              </>
            )}
          />
        </Field>
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Closure evidence (optional)">
        <Controller
          control={control}
          name="closureEvidence"
          render={({ field: { ref: _ref, ...field } }) => (
            <Input
              {...field}
              aria-label="Closure evidence"
              placeholder="Free text or a link to the evidence that closed this finding"
            />
          )}
        />
      </IsmsFieldLabel>
    </Stack>
  );
}
