'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Stack,
} from '@trycompai/design-system';
import { UserMultiple, WarningAlt } from '@trycompai/design-system/icons';
import type { IsmsRole } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import type { RoleFormValues } from './role-schema';
import { RolesForm } from './RolesForm';
import { RolesRow, type RolesRowHandlers } from './RolesRow';
import { SPO_ROLE_KEY, type IsmsTeamSizeBand } from './roles-constants';
import { IsmsRegisterShell } from './shared';

interface RolesTableProps extends RolesRowHandlers {
  roles: IsmsRole[];
  canEdit: boolean;
  memberOptions: ApproverOption[];
  band: IsmsTeamSizeBand;
  validationMessages: string[];
  onCreateRole: (values: RoleFormValues) => Promise<void>;
}

export function RolesTable({
  roles,
  canEdit,
  memberOptions,
  band,
  validationMessages,
  onCreateRole,
  ...handlers
}: RolesTableProps) {
  const rows = Array.isArray(roles) ? roles : [];
  const spoMemberIds = rows
    .filter((role) => role.roleKey === SPO_ROLE_KEY)
    .flatMap((role) => role.assignments.map((assignment) => assignment.memberId));

  return (
    <Stack gap="4">
      {band === 'small' ? (
        <Alert>
          <AlertTitle>Small team</AlertTitle>
          <AlertDescription>
            Your organisation has three or fewer people. The Deputy Security &amp; Privacy Owner is
            optional at this size, and the Internal Auditor route defaults to an external
            independent auditor to preserve objectivity.
          </AlertDescription>
        </Alert>
      ) : null}

      {validationMessages.length > 0 ? (
        <Alert variant="warning" icon={<WarningAlt />}>
          <AlertTitle>Complete these to generate the document</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5">
              {validationMessages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <IsmsRegisterShell
        title="Governance roles"
        count={rows.length}
        emptyIcon={UserMultiple}
        emptyTitle="No roles yet"
        emptyDescription="The seeded governance roles appear here. Assign members and complete their details."
        footer={canEdit ? <RolesForm onAdd={onCreateRole} /> : undefined}
      >
        <Stack gap="3">
          {rows.map((role) => (
            <RolesRow
              key={role.id}
              role={role}
              canEdit={canEdit}
              memberOptions={memberOptions}
              spoMemberIds={spoMemberIds}
              {...handlers}
            />
          ))}
        </Stack>
      </IsmsRegisterShell>
    </Stack>
  );
}
