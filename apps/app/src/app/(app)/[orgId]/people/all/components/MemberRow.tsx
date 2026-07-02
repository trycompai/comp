'use client';

import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { parseRolesString } from '@/lib/permissions';
import type { Role } from '@db';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  Label,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import {
  Checkmark,
  Edit,
  Email,
  Laptop,
  OverflowMenuVertical,
  TrashCan,
} from '@trycompai/design-system/icons';

import { toast } from 'sonner';
import { BackgroundCheckVerifiedTick } from '../../components/BackgroundCheckVerifiedTick';
import { MultiRoleCombobox } from './MultiRoleCombobox';
import { RemoveDeviceAlert } from './RemoveDeviceAlert';
import { TaskRequirements, type TaskRequirementItem } from './TaskRequirements';
import { RemoveMemberAlert } from './RemoveMemberAlert';
import type { CustomRoleOption } from './MultiRoleCombobox';
import type {
  BackgroundCheckStatus,
  MemberWithUser,
  TaskCompletion,
  TwoFactorStatus,
} from './TeamMembers';

interface MemberRowProps {
  member: MemberWithUser;
  onRemove: (memberId: string, options: { skipOffboarding: boolean }) => void;
  onRemoveDevice: (memberId: string) => void;
  onUpdateRole: (memberId: string, roles: string[]) => void;
  onReactivate: (memberId: string) => void;
  onResendPortalInvite?: (memberId: string) => void;
  canEdit: boolean;
  isCurrentUserOwner: boolean;
  customRoles?: CustomRoleOption[];
  taskCompletion?: TaskCompletion;
  deviceStatus?: 'compliant' | 'non-compliant' | 'stale' | 'not-installed';
  isDeviceStatusLoading?: boolean;
  backgroundCheckStatus?: BackgroundCheckStatus;
  backgroundCheckStepEnabled?: boolean;
  /** From the org's configured 2FA source; absent when no source is configured. */
  twoFactorStatus?: TwoFactorStatus;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return '??';
}

function getRoleLabel(role: string): string {
  const builtInLabels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    auditor: 'Auditor',
    employee: 'Employee',
    contractor: 'Contractor',
  };
  // Built-in roles get their known label; custom roles display their name as-is
  return builtInLabels[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function parseRoles(role: Role | Role[] | string): string[] {
  if (Array.isArray(role)) return role as string[];
  return parseRolesString(role);
}

function isBackgroundCheckComplete(status?: BackgroundCheckStatus): boolean {
  return status === 'completed' || status === 'completed_with_flags';
}

export function MemberRow({
  member,
  onRemove,
  onRemoveDevice,
  onUpdateRole,
  onReactivate,
  onResendPortalInvite,
  canEdit,
  isCurrentUserOwner,
  customRoles = [],
  taskCompletion,
  deviceStatus,
  isDeviceStatusLoading = false,
  backgroundCheckStatus,
  backgroundCheckStepEnabled = true,
  twoFactorStatus,
}: MemberRowProps) {
  const { orgId } = useParams<{ orgId: string }>();

  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isUpdateRolesOpen, setIsUpdateRolesOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(() => parseRoles(member.role));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const memberName = member.user.name || member.user.email || 'Member';
  const memberEmail = member.user.email || '';
  const memberAvatar = member.user.image;
  const memberId = member.id;
  const currentRoles = parseRoles(member.role);

  const isOwner = currentRoles.includes('owner');
  const isAuditorOnly = currentRoles.length > 0 && currentRoles.every((role) => role === 'auditor');
  const isPlatformAdmin = member.user.role === 'admin';
  const canRemove = !isOwner;
  const isDeactivated = member.deactivated || !member.isActive;
  const profileHref = `/${orgId}/people/${memberId}`;
  const hasCompletedBackgroundCheck = isBackgroundCheckComplete(backgroundCheckStatus);
  const memberExempt = member.backgroundCheckExempt === true;
  const shouldShowTaskRequirements = !isPlatformAdmin && !isDeactivated;
  const taskItems: TaskRequirementItem[] = [];

  if (taskCompletion) {
    // total === 0 means "nothing to complete" (e.g. no required policies) —
    // that's not-applicable, not incomplete, so no row at all.
    if (taskCompletion.policies.total > 0) {
      taskItems.push({
        label: 'Policies',
        completed: taskCompletion.policies.completed,
        total: taskCompletion.policies.total,
        kind: 'count',
      });
    }

    if (taskCompletion.training.total > 0) {
      taskItems.push({
        label: 'Training',
        completed: taskCompletion.training.completed,
        total: taskCompletion.training.total,
        kind: 'count',
      });
    }

    if (taskCompletion.hipaa) {
      taskItems.push({
        label: 'HIPAA',
        completed: taskCompletion.hipaa.completed,
        total: taskCompletion.hipaa.total,
        kind: 'binary',
      });
    }
  }

  if (shouldShowTaskRequirements && deviceStatus) {
    taskItems.push({
      label: 'Device',
      completed: deviceStatus === 'compliant' ? 1 : 0,
      total: 1,
      kind: 'binary',
    });
  }

  if (shouldShowTaskRequirements && backgroundCheckStepEnabled && !memberExempt && !isAuditorOnly) {
    taskItems.push({
      label: 'Background',
      completed: hasCompletedBackgroundCheck ? 1 : 0,
      total: 1,
      kind: 'binary',
    });
  }

  // 2FA applies to EVERY non-deactivated member (platform admins included),
  // unlike the compliance-scoped rows above. Absent status = no 2FA source
  // configured for the org, so no row.
  if (!isDeactivated && twoFactorStatus) {
    taskItems.push({
      label: '2FA',
      completed: twoFactorStatus === 'enabled' ? 1 : 0,
      total: 1,
      kind: 'binary',
      state:
        twoFactorStatus === 'enabled'
          ? 'done'
          : twoFactorStatus === 'missing'
            ? 'missing'
            : 'not-provided',
    });
  }

  const isDeviceLoadingRow = shouldShowTaskRequirements && isDeviceStatusLoading && !deviceStatus;

  const handleEditRolesClick = () => {
    setSelectedRoles(parseRoles(member.role));
    setDropdownOpen(false);
    setIsUpdateRolesOpen(true);
  };

  const handleUpdateRolesClick = async () => {
    let rolesToUpdate = selectedRoles;
    if (isOwner && !rolesToUpdate.includes('owner')) {
      rolesToUpdate = [...rolesToUpdate, 'owner'];
    }

    if (rolesToUpdate.length === 0) {
      return;
    }

    setIsUpdating(true);
    await onUpdateRole(memberId, rolesToUpdate);
    setIsUpdating(false);
    setIsUpdateRolesOpen(false);
  };

  const handleRemoveClick = async (options: { skipOffboarding: boolean }) => {
    if (!canRemove) return;
    setIsRemoveAlertOpen(false);
    setIsRemoving(true);
    try {
      await onRemove(memberId, options);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleReactivateClick = async () => {
    setDropdownOpen(false);
    setIsReactivating(true);
    try {
      await onReactivate(memberId);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleResendPortalInviteClick = async () => {
    if (!onResendPortalInvite) return;
    setDropdownOpen(false);
    setIsSendingInvite(true);
    try {
      await onResendPortalInvite(memberId);
      toast.success('Portal invite email sent');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send portal invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRemoveDeviceClick = async () => {
    try {
      setIsRemoveDeviceAlertOpen(false);
      setIsRemovingDevice(true);
      await onRemoveDevice(memberId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink device');
    } finally {
      setIsRemovingDevice(false);
    }
  };

  return (
    <>
      <TableRow data-state={isDeactivated ? 'disabled' : undefined}>
        {/* NAME */}
        <TableCell>
          <HStack gap="3" align="center">
            <div className={`flex-shrink-0 ${isDeactivated ? 'grayscale opacity-60' : ''}`}>
              <Avatar>
                <AvatarImage src={memberAvatar || undefined} />
                <AvatarFallback>{getInitials(member.user.name, member.user.email)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <Link
                  href={profileHref}
                  className={`truncate text-sm font-medium hover:underline ${
                    isDeactivated ? 'text-muted-foreground' : ''
                  }`}
                >
                  {memberName}
                </Link>
                {backgroundCheckStepEnabled && !memberExempt && hasCompletedBackgroundCheck && (
                  <BackgroundCheckVerifiedTick />
                )}
              </div>
              <Text variant="muted">{memberEmail}</Text>
            </div>
          </HStack>
        </TableCell>

        {/* STATUS */}
        <TableCell>
          {isDeactivated ? (
            <Badge variant="destructive">Inactive</Badge>
          ) : (
            <Badge variant="secondary">Active</Badge>
          )}
        </TableCell>

        {/* ROLE */}
        <TableCell>
          <div className="w-[160px]">
            <div className="flex flex-wrap gap-1">
              {member.user.role === 'admin' && (
                <Badge>Comp AI</Badge>
              )}
              {currentRoles.map((role) => (
                <Badge key={role} variant="outline">
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </div>
          </div>
        </TableCell>

        {/* ONBOARDED */}
        <TableCell>
          {member.onboardDate ? (
            <Text size="sm" variant="muted">
              {format(member.onboardDate, 'MMM d, yyyy')}
            </Text>
          ) : (
            <Text size="sm" variant="muted">—</Text>
          )}
        </TableCell>

        {/* OFFBOARDED */}
        <TableCell>
          {member.offboardDate ? (
            <Text size="sm" variant="muted">
              {format(member.offboardDate, 'MMM d, yyyy')}
            </Text>
          ) : (
            <Text size="sm" variant="muted">—</Text>
          )}
        </TableCell>

        {/* TASKS */}
        <TableCell>
          <TaskRequirements items={taskItems} showLoadingRow={isDeviceLoadingRow} />
        </TableCell>

        {/* ACTIONS */}
        <TableCell>
          <div className="flex justify-center">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger
                disabled={!canEdit}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                  <OverflowMenuVertical />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDeactivated && canEdit && (
                  <DropdownMenuItem onClick={handleReactivateClick} disabled={isReactivating}>
                    <Checkmark size={16} className="mr-2" />
                    <span>{isReactivating ? 'Reinstating...' : 'Reinstate Member'}</span>
                  </DropdownMenuItem>
                )}
                {!isDeactivated && canEdit && (
                  <DropdownMenuItem onClick={handleEditRolesClick}>
                    <Edit size={16} className="mr-2" />
                    <span>Edit Roles</span>
                  </DropdownMenuItem>
                )}
                {!isDeactivated && canEdit && (
                  <DropdownMenuItem
                    onClick={handleResendPortalInviteClick}
                    disabled={isSendingInvite}
                  >
                    <Email size={16} className="mr-2" />
                    <span>{isSendingInvite ? 'Sending...' : 'Resend Portal Invite'}</span>
                  </DropdownMenuItem>
                )}
                {!isDeactivated &&
                  (member.fleetDmLabelId || (deviceStatus && deviceStatus !== 'not-installed')) &&
                  isCurrentUserOwner && (
                    <DropdownMenuItem
                      onClick={() => {
                        setDropdownOpen(false);
                        setIsRemoveDeviceAlertOpen(true);
                      }}
                    >
                      <Laptop size={16} className="mr-2" />
                      <span>Remove Device</span>
                    </DropdownMenuItem>
                  )}
                {!isDeactivated && canRemove && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDropdownOpen(false);
                      setIsRemoveAlertOpen(true);
                    }}
                  >
                    <TrashCan size={16} className="mr-2" />
                    <span>Remove Member</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <RemoveMemberAlert
        open={isRemoveAlertOpen}
        onOpenChange={setIsRemoveAlertOpen}
        memberName={memberName}
        onRemove={handleRemoveClick}
        isRemoving={isRemoving}
      />
      <RemoveDeviceAlert
        open={isRemoveDeviceAlertOpen}
        title="Remove Device"
        description={
          <>
            Are you sure you want to remove all devices for this user <strong>{memberName}</strong>?
            This will disconnect all devices from the organization.
          </>
        }
        onOpenChange={setIsRemoveDeviceAlertOpen}
        onRemove={handleRemoveDeviceClick}
        isRemoving={isRemovingDevice}
      />

      {/* Edit Roles Dialog */}
      <Dialog open={isUpdateRolesOpen} onOpenChange={setIsUpdateRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Roles</DialogTitle>
            <DialogDescription>Change roles for {memberName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`role-${memberId}`}>Roles</Label>
              {isPlatformAdmin && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Badge>Comp AI</Badge>
                  <span className="text-muted-foreground text-xs">
                    This role is managed by the platform and cannot be removed.
                  </span>
                </div>
              )}
              <MultiRoleCombobox
                selectedRoles={selectedRoles}
                onSelectedRolesChange={setSelectedRoles}
                placeholder="Select a role"
                lockedRoles={isOwner ? ['owner'] : []}
                customRoles={customRoles}
              />
              {isOwner && (
                <p className="text-muted-foreground mt-1 text-xs">
                  The owner role cannot be removed.
                </p>
              )}
              <p className="text-muted-foreground mt-1 text-xs">
                Members must have at least one role.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateRolesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRolesClick}
              disabled={isUpdating || selectedRoles.length === 0}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
