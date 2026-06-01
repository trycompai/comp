'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@trycompai/design-system';
import { ListChecked } from '@trycompai/design-system/icons';
import type { IsmsInterestedPartyRequirement } from '../isms-types';
import { IsmsRegisterShell } from './shared';
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
    <IsmsRegisterShell
      title="Requirements & ISMS Treatment"
      count={rows.length}
      emptyIcon={ListChecked}
      emptyTitle="No requirements yet"
      emptyDescription="Record the information-security requirements of your interested parties and how the ISMS addresses each."
      footer={canEdit ? <RequirementsForm onAdd={onCreate} /> : undefined}
    >
      <Table variant="bordered">
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
    </IsmsRegisterShell>
  );
}
