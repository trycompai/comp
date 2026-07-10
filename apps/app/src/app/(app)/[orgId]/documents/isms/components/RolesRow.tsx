'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Grid,
  Heading,
  HStack,
  Stack,
} from '@trycompai/design-system';
import { Edit, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { IsmsRole } from '../isms-types';
import type { ApproverOption } from './IsmsApprovalSection';
import { AuditRoutePicker, type AuditRouteUpdate } from './AuditRoutePicker';
import { RoleAssignments } from './RoleAssignments';
import type { AssignmentCompetenceUpdate } from './RoleAssignmentRow';
import { RoleFields } from './RoleFields';
import { roleSchema, type RoleFormValues } from './role-schema';
import { INTERNAL_AUDITOR_ROLE_KEY } from './roles-constants';
import { IsmsRegisterCard, IsmsRegisterField, IsmsSourceBadge } from './shared';

export interface RolesRowHandlers {
  onUpdateRole: (roleId: string, values: RoleFormValues) => Promise<void>;
  onDeleteRole: (roleId: string) => Promise<void>;
  onSaveAuditRoute: (roleId: string, update: AuditRouteUpdate) => Promise<void>;
  onAddAssignment: (roleId: string, memberId: string) => Promise<void>;
  onUpdateAssignment: (
    assignmentId: string,
    update: AssignmentCompetenceUpdate,
  ) => Promise<void>;
  onRemoveAssignment: (assignmentId: string) => Promise<void>;
}

interface RolesRowProps extends RolesRowHandlers {
  role: IsmsRole;
  canEdit: boolean;
  memberOptions: ApproverOption[];
  spoMemberIds: string[];
}

function toFormValues(role: IsmsRole): RoleFormValues {
  return {
    name: role.name,
    description: role.description,
    responsibilities: role.responsibilities,
    authorities: role.authorities,
    authorityGrantedBy: role.authorityGrantedBy,
    requiredCompetence: role.requiredCompetence,
  };
}

export function RolesRow({
  role,
  canEdit,
  memberOptions,
  spoMemberIds,
  onUpdateRole,
  onDeleteRole,
  onSaveAuditRoute,
  onAddAssignment,
  onUpdateAssignment,
  onRemoveAssignment,
}: RolesRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isCustom = role.roleKey === null;
  const isAuditor = role.roleKey === INTERNAL_AUDITOR_ROLE_KEY;

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isValid, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    mode: 'onChange',
    defaultValues: toFormValues(role),
  });

  useEffect(() => {
    if (!isEditing) reset(toFormValues(role));
  }, [role, isEditing, reset]);

  const handleSave = handleSubmit(async (values) => {
    try {
      await onUpdateRole(role.id, values);
    } catch {
      return;
    }
    setIsEditing(false);
  });

  const handleDelete = async () => {
    setConfirmOpen(false);
    setIsDeleting(true);
    try {
      await onDeleteRole(role.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const headerActions = canEdit ? (
    isEditing ? (
      <HStack align="center" gap="2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            reset(toFormValues(role));
            setIsEditing(false);
          }}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleSave}
          disabled={!isDirty || !isValid || isSubmitting}
          loading={isSubmitting}
        >
          Save
        </Button>
      </HStack>
    ) : (
      <HStack align="center" gap="1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          iconLeft={<Edit size={16} />}
          aria-label={`Edit ${role.name}`}
        >
          Edit details
        </Button>
        {isCustom ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            loading={isDeleting}
            iconLeft={<TrashCan size={16} />}
            aria-label={`Delete ${role.name}`}
          />
        ) : null}
      </HStack>
    )
  ) : undefined;

  return (
    <IsmsRegisterCard
      header={
        <Stack gap="2">
          <IsmsSourceBadge source={role.source} derivedFrom={role.derivedFrom} />
          <Heading level="4">{role.name}</Heading>
        </Stack>
      }
      headerEnd={headerActions}
    >
      {isEditing ? (
        <RoleFields control={control} showName={isCustom} />
      ) : (
        <Stack gap="4">
          <Grid cols={{ base: '1', md: '2' }} gap="3">
            <IsmsRegisterField label="Description">
              {role.description || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Responsibilities">
              {role.responsibilities || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Authorities">
              {role.authorities || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Authority granted by">
              {role.authorityGrantedBy || '—'}
            </IsmsRegisterField>
            <IsmsRegisterField label="Required competence">
              {role.requiredCompetence || '—'}
            </IsmsRegisterField>
          </Grid>

          <RoleAssignments
            role={role}
            canEdit={canEdit}
            memberOptions={memberOptions}
            onAddAssignment={(memberId) => onAddAssignment(role.id, memberId)}
            onUpdateAssignment={onUpdateAssignment}
            onRemoveAssignment={onRemoveAssignment}
          />

          {isAuditor ? (
            <AuditRoutePicker
              role={role}
              canEdit={canEdit}
              memberOptions={memberOptions}
              spoMemberIds={spoMemberIds}
              onSave={(update) => onSaveAuditRoute(role.id, update)}
            />
          ) : null}
        </Stack>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the custom role and its member assignments. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </IsmsRegisterCard>
  );
}
