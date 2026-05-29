'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@trycompai/design-system';
import type { IsmsInterestedParty } from '../isms-types';
import { InterestedPartiesForm } from './InterestedPartiesForm';
import { InterestedPartiesRow } from './InterestedPartiesRow';

interface InterestedPartiesTableProps {
  parties: IsmsInterestedParty[];
  canEdit: boolean;
  onCreate: (params: {
    name: string;
    category: string;
    needsExpectations: string;
  }) => Promise<void>;
  onUpdate: (params: {
    partyId: string;
    input: { name: string; category: string; needsExpectations: string };
  }) => Promise<void>;
  onDelete: (partyId: string) => Promise<void>;
}

export function InterestedPartiesTable({
  parties,
  canEdit,
  onCreate,
  onUpdate,
  onDelete,
}: InterestedPartiesTableProps) {
  const safeParties = Array.isArray(parties) ? parties : [];

  return (
    <div className="flex flex-col gap-3">
      <Text size="base" weight="semibold">
        Interested Parties
      </Text>
      {safeParties.length === 0 ? (
        <div className="rounded-md border border-dashed py-6 text-center">
          <Text variant="muted">No interested parties yet.</Text>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Needs &amp; Expectations</TableHead>
              {canEdit && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeParties.map((party) => (
              <InterestedPartiesRow
                key={party.id}
                party={party}
                canEdit={canEdit}
                onSave={({ name, category, needsExpectations }) =>
                  onUpdate({
                    partyId: party.id,
                    input: { name, category, needsExpectations },
                  })
                }
                onDelete={() => onDelete(party.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit && <InterestedPartiesForm onAdd={onCreate} />}
    </div>
  );
}
