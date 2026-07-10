'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Stack,
  Text,
} from '@trycompai/design-system';
import { useMemo, useState } from 'react';
import type { IsmsRole } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import {
  RoleAssignmentRow,
  type AssignmentCompetenceUpdate,
} from './RoleAssignmentRow';
import { IsmsFieldLabel } from './shared';

interface RoleAssignmentsProps {
  role: IsmsRole;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  onAddAssignment: (memberId: string) => Promise<void>;
  onUpdateAssignment: (
    assignmentId: string,
    update: AssignmentCompetenceUpdate,
  ) => Promise<void>;
  onRemoveAssignment: (assignmentId: string) => Promise<void>;
}

export function RoleAssignments({
  role,
  canEdit,
  memberOptions,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
}: RoleAssignmentsProps) {
  const [pendingMember, setPendingMember] = useState('');

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const option of memberOptions) map[option.id] = option.name;
    return map;
  }, [memberOptions]);

  const assignedIds = new Set(role.assignments.map((a) => a.memberId));
  const availableMembers = memberOptions.filter(
    (option) => !assignedIds.has(option.id),
  );

  const handleAdd = (memberId: string | null | undefined) => {
    if (!memberId) return;
    // Reset the picker back to its placeholder after selecting.
    setPendingMember('');
    // The caller surfaces failures via toast and re-throws; swallow here so a
    // failed add can't leak an unhandled promise rejection.
    void onAddAssignment(memberId).catch(() => {});
  };

  return (
    <Stack gap="3">
      <IsmsFieldLabel label="Assigned members">
        {role.assignments.length === 0 ? (
          <Text size="sm" variant="muted">
            No members assigned yet.
          </Text>
        ) : (
          <Stack gap="2">
            {role.assignments.map((assignment) => (
              <RoleAssignmentRow
                key={assignment.id}
                assignment={assignment}
                memberName={
                  memberNameById[assignment.memberId] ?? assignment.memberId
                }
                canEdit={canEdit}
                onUpdate={(update) => onUpdateAssignment(assignment.id, update)}
                onRemove={() => onRemoveAssignment(assignment.id)}
              />
            ))}
          </Stack>
        )}
      </IsmsFieldLabel>

      {canEdit && availableMembers.length > 0 ? (
        <div className="max-w-sm">
          <Select value={pendingMember || undefined} onValueChange={handleAdd}>
            <SelectTrigger aria-label="Assign a member to this role">
              <SelectValue placeholder="Assign a member…" />
            </SelectTrigger>
            <SelectContent>
              {availableMembers.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </Stack>
  );
}
