'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { Flag } from '@trycompai/design-system/icons';
import type { IsmsObjective } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsRegisterShell } from './shared';
import { ObjectivesForm, type ObjectiveFormValues } from './ObjectivesForm';
import { ObjectivesRow, type ObjectiveRowUpdate } from './ObjectivesRow';

interface ObjectivesTableProps {
  objectives: IsmsObjective[];
  canEdit: boolean;
  ownerOptions: ApproverOption[];
  onCreate: (values: ObjectiveFormValues) => Promise<void>;
  onUpdate: (params: { objectiveId: string; update: ObjectiveRowUpdate }) => Promise<void>;
  onDelete: (objectiveId: string) => Promise<void>;
}

export function ObjectivesTable({
  objectives,
  canEdit,
  ownerOptions,
  onCreate,
  onUpdate,
  onDelete,
}: ObjectivesTableProps) {
  const rows = Array.isArray(objectives) ? objectives : [];

  return (
    <IsmsRegisterShell
      title="Objectives"
      count={rows.length}
      emptyIcon={Flag}
      emptyTitle="No objectives yet"
      emptyDescription="Define measurable information-security objectives, assign owners, and track progress toward each target."
      footer={canEdit ? <ObjectivesForm ownerOptions={ownerOptions} onAdd={onCreate} /> : undefined}
    >
      <Table variant="bordered">
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Objective</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Cadence</TableHead>
            <TableHead>Measurement</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            {canEdit && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((objective) => (
            <ObjectivesRow
              key={objective.id}
              objective={objective}
              canEdit={canEdit}
              ownerOptions={ownerOptions}
              onSave={(update) => onUpdate({ objectiveId: objective.id, update })}
              onDelete={() => onDelete(objective.id)}
            />
          ))}
        </TableBody>
      </Table>
    </IsmsRegisterShell>
  );
}
