'use client';

import {
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableCell,
  TableRow,
  Text,
  Textarea,
} from '@trycompai/design-system';
import { useState } from 'react';
import type { IsmsObjective, IsmsObjectiveStatus } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsRowActions, IsmsSourceBadge } from './shared';
import { OBJECTIVE_STATUS_LABELS } from './ObjectivesForm';

const OBJECTIVE_STATUSES: IsmsObjectiveStatus[] = ['not_started', 'on_track', 'at_risk', 'met'];

const STATUS_VARIANT: Record<IsmsObjectiveStatus, 'outline' | 'secondary' | 'accent' | 'destructive'> = {
  not_started: 'outline',
  on_track: 'secondary',
  at_risk: 'destructive',
  met: 'accent',
};

function isObjectiveStatus(value: string | null): value is IsmsObjectiveStatus {
  return value !== null && OBJECTIVE_STATUSES.includes(value as IsmsObjectiveStatus);
}

export interface ObjectiveRowUpdate {
  objective: string;
  target: string;
  ownerMemberId: string;
  cadence: string;
  plan: string;
  measurementMethod: string;
  status: IsmsObjectiveStatus;
}

interface ObjectivesRowProps {
  objective: IsmsObjective;
  canEdit: boolean;
  ownerOptions: ApproverOption[];
  onSave: (update: ObjectiveRowUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
}

function ownerDisplay({
  ownerMemberId,
  ownerOptions,
}: {
  ownerMemberId: string | null;
  ownerOptions: ApproverOption[];
}): string {
  if (!ownerMemberId) return '—';
  return ownerOptions.find((option) => option.id === ownerMemberId)?.name ?? ownerMemberId;
}

export function ObjectivesRow({
  objective,
  canEdit,
  ownerOptions,
  onSave,
  onDelete,
}: ObjectivesRowProps) {
  const [draft, setDraft] = useState<ObjectiveRowUpdate>({
    objective: objective.objective,
    target: objective.target ?? '',
    ownerMemberId: objective.ownerMemberId ?? '',
    cadence: objective.cadence ?? '',
    plan: objective.plan ?? '',
    measurementMethod: objective.measurementMethod ?? '',
    status: objective.status,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasOwnerOptions = ownerOptions.length > 0;
  const isDirty =
    draft.objective !== objective.objective ||
    draft.target !== (objective.target ?? '') ||
    draft.ownerMemberId !== (objective.ownerMemberId ?? '') ||
    draft.cadence !== (objective.cadence ?? '') ||
    draft.plan !== (objective.plan ?? '') ||
    draft.measurementMethod !== (objective.measurementMethod ?? '') ||
    draft.status !== objective.status;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canEdit) {
    return (
      <TableRow>
        <TableCell>
          <IsmsSourceBadge source={objective.source} derivedFrom={objective.derivedFrom} />
        </TableCell>
        <TableCell>
          <Text size="sm">{objective.objective}</Text>
        </TableCell>
        <TableCell>
          <Text size="sm">{objective.target ?? '—'}</Text>
        </TableCell>
        <TableCell>
          <Text size="sm">
            {ownerDisplay({ ownerMemberId: objective.ownerMemberId, ownerOptions })}
          </Text>
        </TableCell>
        <TableCell>
          <Text size="sm">{objective.cadence ?? '—'}</Text>
        </TableCell>
        <TableCell>
          <Text size="sm">{objective.measurementMethod ?? '—'}</Text>
        </TableCell>
        <TableCell>
          <Text size="sm">{objective.plan ?? '—'}</Text>
        </TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANT[objective.status]}>
            {OBJECTIVE_STATUS_LABELS[objective.status]}
          </Badge>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <IsmsSourceBadge source={objective.source} derivedFrom={objective.derivedFrom} />
      </TableCell>
      <TableCell>
        <Textarea
          value={draft.objective}
          onChange={(event) => setDraft((prev) => ({ ...prev, objective: event.target.value }))}
          rows={3}
          aria-label="Objective"
        />
      </TableCell>
      <TableCell>
        <Input
          value={draft.target}
          onChange={(event) => setDraft((prev) => ({ ...prev, target: event.target.value }))}
          aria-label="Objective target"
        />
      </TableCell>
      <TableCell>
        {hasOwnerOptions ? (
          <Select
            value={draft.ownerMemberId || undefined}
            onValueChange={(value) =>
              setDraft((prev) => ({ ...prev, ownerMemberId: value ?? '' }))
            }
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
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, ownerMemberId: event.target.value }))
            }
            aria-label="Objective owner"
          />
        )}
      </TableCell>
      <TableCell>
        <Input
          value={draft.cadence}
          onChange={(event) => setDraft((prev) => ({ ...prev, cadence: event.target.value }))}
          aria-label="Objective cadence"
        />
      </TableCell>
      <TableCell>
        <Input
          value={draft.measurementMethod}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, measurementMethod: event.target.value }))
          }
          aria-label="Objective measurement method"
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={draft.plan}
          onChange={(event) => setDraft((prev) => ({ ...prev, plan: event.target.value }))}
          rows={3}
          aria-label="Objective plan"
        />
      </TableCell>
      <TableCell>
        <Select
          value={draft.status}
          onValueChange={(value) => {
            if (isObjectiveStatus(value)) {
              setDraft((prev) => ({ ...prev, status: value }));
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
      </TableCell>
      <TableCell>
        <IsmsRowActions
          onSave={handleSave}
          onDelete={handleDelete}
          isDirty={isDirty}
          isSaving={isSaving}
          isDeleting={isDeleting}
          deleteLabel="Delete objective"
        />
      </TableCell>
    </TableRow>
  );
}
