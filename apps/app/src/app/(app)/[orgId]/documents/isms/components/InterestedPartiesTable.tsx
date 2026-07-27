'use client';

import { Stack } from '@trycompai/design-system';
import { UserMultiple } from '@trycompai/design-system/icons';
import type { IsmsInterestedParty } from '../isms-types';
import { IsmsRegisterShell } from './shared';
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
    <IsmsRegisterShell
      title="Interested Parties"
      count={safeParties.length}
      emptyIcon={UserMultiple}
      emptyTitle="No interested parties yet"
      emptyDescription="List the parties relevant to your ISMS and the needs and expectations you must meet for each."
      footer={canEdit ? <InterestedPartiesForm onAdd={onCreate} /> : undefined}
    >
      <Stack gap="3">
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
      </Stack>
    </IsmsRegisterShell>
  );
}
