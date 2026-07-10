'use client';

import { toast } from 'sonner';
import type { IsmsDocument as IsmsDocumentData } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { IsmsDocumentShell } from './IsmsDocumentShell';
import { RolesTable } from './RolesTable';
import type { RoleFormValues } from './role-schema';
import { roleValidationMessages, teamSizeBand } from './roles-constants';

interface RolesClientProps {
  organizationId: string;
  documentId: string;
  fallbackData: IsmsDocumentData | null;
  currentMemberId: string | null;
  approverOptions: ApproverOption[];
  memberOptions: ApproverOption[];
}

const ROLES = 'roles' as const;
const ASSIGNMENTS = 'role-assignments' as const;

async function run(action: Promise<void>, successMessage: string, failMessage: string) {
  try {
    await action;
    toast.success(successMessage);
  } catch (caught) {
    toast.error(caught instanceof Error ? caught.message : failMessage);
    // Re-throw so the calling form/row keeps its state on failure.
    throw caught;
  }
}

export function RolesClient({ memberOptions, ...props }: RolesClientProps) {
  const band = teamSizeBand(memberOptions.length);
  // memberOptions is the active People list, so this is the set of active member
  // ids — used to match the server's active-only completeness gate.
  const activeMemberIds = new Set(memberOptions.map((member) => member.id));

  return (
    <IsmsDocumentShell
      {...props}
      clause="5.3"
      title="Roles, Responsibilities and Authorities"
      description="Define the ISMS governance roles, their responsibilities and authorities, and the members who hold them (ISO 27001 clause 5.3). Assign members and complete each role before generating the document."
      sectionTitle="Governance roles"
      sectionDescription="Real ISMS governance roles — distinct from Comp AI application-access levels."
      generateSuccessMessage="Restored any missing seeded roles"
      getSubmitBlockedReason={(document) => {
        const messages = roleValidationMessages({
          roles: Array.isArray(document.roles) ? document.roles : [],
          band,
          activeMemberIds,
        });
        return messages.length > 0
          ? `Complete the required assignments before submitting: ${messages.join(' ')}`
          : null;
      }}
    >
      {({ document, canManage, hook }) => {
        const roles = Array.isArray(document.roles) ? document.roles : [];
        const validationMessages = roleValidationMessages({
          roles,
          band,
          activeMemberIds,
        });

        return (
          <RolesTable
            roles={roles}
            canEdit={canManage}
            memberOptions={memberOptions}
            band={band}
            validationMessages={validationMessages}
            onCreateRole={(values: RoleFormValues) =>
              run(
                hook.createRow({ register: ROLES, data: { ...values } }),
                'Role added',
                'Failed to add role',
              )
            }
            onUpdateRole={(roleId, values) =>
              run(
                hook.updateRow({ register: ROLES, id: roleId, data: { ...values } }),
                'Role updated',
                'Failed to update role',
              )
            }
            onDeleteRole={(roleId) =>
              run(
                hook.deleteRow({ register: ROLES, id: roleId }),
                'Role deleted',
                'Failed to delete role',
              )
            }
            onSaveAuditRoute={(roleId, update) =>
              run(
                hook.updateRow({ register: ROLES, id: roleId, data: { ...update } }),
                'Audit route saved',
                'Failed to save audit route',
              )
            }
            onAddAssignment={(roleId, memberId) =>
              run(
                hook.createRow({
                  register: ASSIGNMENTS,
                  data: { roleId, memberId },
                }),
                'Member assigned',
                'Failed to assign member',
              )
            }
            onUpdateAssignment={(assignmentId, update) =>
              run(
                hook.updateRow({
                  register: ASSIGNMENTS,
                  id: assignmentId,
                  data: { ...update },
                }),
                'Competence updated',
                'Failed to update competence',
              )
            }
            onRemoveAssignment={(assignmentId) =>
              run(
                hook.deleteRow({ register: ASSIGNMENTS, id: assignmentId }),
                'Member removed',
                'Failed to remove member',
              )
            }
          />
        );
      }}
    </IsmsDocumentShell>
  );
}
