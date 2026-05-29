'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { IsmsObjective } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
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
    <div className="flex flex-col gap-3">
      <Text size="base" weight="semibold">
        Objectives
      </Text>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center">
          <Text variant="muted">No objectives yet.</Text>
        </div>
      ) : (
        <Table>
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
      )}
      {canEdit && <ObjectivesForm ownerOptions={ownerOptions} onAdd={onCreate} />}
    </div>
  );
}
