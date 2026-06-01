'use client';

import {
  Grid,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Textarea,
} from '@trycompai/design-system';
import type { IsmsObjectiveStatus } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import type { ObjectiveRowUpdate } from './ObjectivesRow';
import { OBJECTIVE_STATUSES, OBJECTIVE_STATUS_LABELS } from './objectives-status';
import { IsmsFieldLabel } from './shared';

function isObjectiveStatus(value: string | null): value is IsmsObjectiveStatus {
  return value !== null && OBJECTIVE_STATUSES.includes(value as IsmsObjectiveStatus);
}

interface ObjectivesRowEditorProps {
  draft: ObjectiveRowUpdate;
  onChange: (next: ObjectiveRowUpdate) => void;
  ownerOptions: ApproverOption[];
}

/**
 * Inline edit form for a single objective card. Factored out of ObjectivesRow so
 * each file stays focused and under the line limit; uses only DS primitives.
 */
export function ObjectivesRowEditor({ draft, onChange, ownerOptions }: ObjectivesRowEditorProps) {
  const hasOwnerOptions = ownerOptions.length > 0;
  const update = (patch: Partial<ObjectiveRowUpdate>) => onChange({ ...draft, ...patch });

  return (
    <Stack gap="3">
      <IsmsFieldLabel label="Objective">
        <Textarea
          value={draft.objective}
          onChange={(event) => update({ objective: event.target.value })}
          rows={3}
          aria-label="Objective"
        />
      </IsmsFieldLabel>
      <Grid cols={{ base: '1', md: '2' }} gap="3">
        <IsmsFieldLabel label="Target">
          <Input
            value={draft.target}
            onChange={(event) => update({ target: event.target.value })}
            aria-label="Objective target"
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Owner">
          {hasOwnerOptions ? (
            <Select
              value={draft.ownerMemberId || undefined}
              onValueChange={(value) => update({ ownerMemberId: value ?? '' })}
            >
              <SelectTrigger aria-label="Objective owner">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent>
                {ownerOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={draft.ownerMemberId}
              onChange={(event) => update({ ownerMemberId: event.target.value })}
              aria-label="Objective owner"
            />
          )}
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Cadence">
          <Input
            value={draft.cadence}
            onChange={(event) => update({ cadence: event.target.value })}
            aria-label="Objective cadence"
          />
        </IsmsFieldLabel>
        <IsmsFieldLabel label="Measurement">
          <Input
            value={draft.measurementMethod}
            onChange={(event) => update({ measurementMethod: event.target.value })}
            aria-label="Objective measurement method"
          />
        </IsmsFieldLabel>
      </Grid>
      <IsmsFieldLabel label="Plan">
        <Textarea
          value={draft.plan}
          onChange={(event) => update({ plan: event.target.value })}
          rows={3}
          aria-label="Objective plan"
        />
      </IsmsFieldLabel>
      <IsmsFieldLabel label="Status">
        <Select
          value={draft.status}
          onValueChange={(value) => {
            if (isObjectiveStatus(value)) {
              update({ status: value });
            }
          }}
        >
          <SelectTrigger aria-label="Objective status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {OBJECTIVE_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {OBJECTIVE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </IsmsFieldLabel>
    </Stack>
  );
}
