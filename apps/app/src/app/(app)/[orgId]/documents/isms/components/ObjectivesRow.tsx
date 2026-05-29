'use client';

import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TableCell,
  TableRow,
  Textarea,
} from '@trycompai/design-system';
import { TrashCan } from '@trycompai/design-system/icons';
import { useState } from 'react';
import type { IsmsObjective, IsmsObjectiveStatus } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { OBJECTIVE_STATUS_LABELS } from './ObjectivesForm';

const OBJECTIVE_STATUSES: IsmsObjectiveStatus[] = ['not_started', 'on_track', 'at_risk', 'met'];

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
          <Badge variant={objective.source === 'derived' ? 'secondary' : 'outline'}>
            {objective.source === 'derived' ? 'Auto-derived' : 'Edited'}
          </Badge>
          {objective.derivedFrom && (
            <div className="mt-1">
              <span className="text-[10px] text-muted-foreground">{objective.derivedFrom}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <span className="text-sm">{objective.objective}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{objective.target ?? '—'}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">
            {ownerDisplay({ ownerMemberId: objective.ownerMemberId, ownerOptions })}
          </span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{objective.cadence ?? '—'}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{objective.measurementMethod ?? '—'}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{objective.plan ?? '—'}</span>
        </TableCell>
        <TableCell>
          <span className="text-sm">{OBJECTIVE_STATUS_LABELS[objective.status]}</span>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <Badge variant={objective.source === 'derived' ? 'secondary' : 'outline'}>
          {objective.source === 'derived' ? 'Auto-derived' : 'Edited'}
        </Badge>
        {objective.derivedFrom && (
          <div className="mt-1">
            <span className="text-[10px] text-muted-foreground">{objective.derivedFrom}</span>
          </div>
        )}
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isDeleting}
            loading={isSaving}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
            loading={isDeleting}
            iconLeft={<TrashCan size={16} />}
            aria-label="Delete objective"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
