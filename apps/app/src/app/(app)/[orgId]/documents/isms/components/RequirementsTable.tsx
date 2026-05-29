'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import { RequirementsForm, type RequirementFormValues } from './RequirementsForm';
import { RequirementsRow, type RequirementRowValues } from './RequirementsRow';

interface RequirementsTableProps {
  requirements: IsmsInterestedPartyRequirement[];
  canEdit: boolean;
  onCreate: (values: RequirementFormValues) => Promise<void>;
  onUpdate: (params: { id: string; values: RequirementRowValues }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function RequirementsTable({
  requirements,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: RequirementsTableProps) {
  const rows = Array.isArray(requirements) ? requirements : [];

  return (
    <div className="flex flex-col gap-3">
      <Text size="base" weight="semibold">
        Requirements &amp; ISMS Treatment
      </Text>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center">
          <Text variant="muted">No requirements yet.</Text>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Interested party</TableHead>
              <TableHead>Requirement</TableHead>
              <TableHead>ISMS treatment</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((requirement) => (
              <RequirementsRow
                key={requirement.id}
                requirement={requirement}
                canEdit={canEdit}
                onSave={(values) => onUpdate({ id: requirement.id, values })}
                onDelete={() => onDelete(requirement.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit && <RequirementsForm onAdd={onCreate} />}
    </div>
  );
}
