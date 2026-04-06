'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@trycompai/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@trycompai/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import { parseRolesString } from '@/lib/permissions';
import type { Role } from '@db';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  HStack,
  Label,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { Checkmark, Edit, Laptop, OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';

import { toast } from 'sonner';
import { MultiRoleCombobox } from './MultiRoleCombobox';
import { RemoveDeviceAlert } from './RemoveDeviceAlert';
import { RemoveMemberAlert } from './RemoveMemberAlert';
import type { CustomRoleOption } from './MultiRoleCombobox';
import type { MemberWithUser, TaskCompletion } from './TeamMembers';

interface MemberRowProps {
  member: MemberWithUser;
  onRemove: (memberId: string) => void;
  onRemoveDevice: (memberId: string) => void;
  onUpdateRole: (memberId: string, roles: string[]) => void;
  onReactivate: (memberId: string) => void;
  canEdit: boolean;
  isCurrentUserOwner: boolean;
  customRoles?: CustomRoleOption[];
  taskCompletion?: TaskCompletion;
  hasDeviceAgentDevice?: boolean;
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

export function MemberRow({
  member,
  onRemove,
  onRemoveDevice,
  onUpdateRole,
  onReactivate,
  canEdit,
  isCurrentUserOwner,
  customRoles = [],
  taskCompletion,
  hasDeviceAgentDevice,
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

  const memberName = member.user.name || member.user.email || 'Member';
  const memberEmail = member.user.email || '';
  const memberAvatar = member.user.image;
  const memberId = member.id;
  const currentRoles = parseRoles(member.role);
  const taskProgressPercent =
    taskCompletion && taskCompletion.total > 0
      ? Math.round((taskCompletion.completed / taskCompletion.total) * 100)
      : 0;

  const isOwner = currentRoles.includes('owner');
  const isPlatformAdmin = member.user.role === 'admin';
  const canRemove = !isOwner;
  const isDeactivated = member.deactivated || !member.isActive;
  const profileHref = `/${orgId}/people/${memberId}`;

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

  const handleRemoveClick = async () => {
    if (!canRemove) return;
    setIsRemoveAlertOpen(false);
    setIsRemoving(true);
    try {
      await onRemove(memberId);
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
              <Link
                href={profileHref}
                className={`truncate text-sm font-medium hover:underline ${
                  isDeactivated ? 'text-muted-foreground' : ''
                }`}
              >
                {memberName}
              </Link>
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

        {/* AGENT */}
        <TableCell>
          {isPlatformAdmin || isDeactivated ? (
            <Text size="sm" variant="muted">
              —
            </Text>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  hasDeviceAgentDevice ? 'bg-green-500' : 'bg-red-400'
                }`}
              />
              <span className={`text-sm ${hasDeviceAgentDevice ? 'text-foreground' : 'text-muted-foreground'}`}>
                {hasDeviceAgentDevice ? 'Installed' : 'Not Installed'}
              </span>
            </div>
          )}
        </TableCell>

        {/* TASKS */}
        <TableCell>
          {taskCompletion ? (
            <div className="w-[220px]">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${taskProgressPercent}%` }}
                />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                <Text size="xs" variant="muted">
                  Policies {taskCompletion.policies.completed}/{taskCompletion.policies.total}
                </Text>
                {taskCompletion.training.total > 0 && (
                  <Text size="xs" variant="muted">
                    Training {taskCompletion.training.completed}/{taskCompletion.training.total}
                  </Text>
                )}
                {taskCompletion.hipaa && (
                  <Text size="xs" variant="muted">
                    HIPAA {taskCompletion.hipaa.completed}/{taskCompletion.hipaa.total}
                  </Text>
                )}
              </div>
            </div>
          ) : (
            <Text size="sm" variant="muted">
              —
            </Text>
          )}
        </TableCell>

        {/* ACTIONS */}
        <TableCell>
          <div className="flex justify-center">
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!canEdit}>
                  <OverflowMenuVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isDeactivated && canEdit && (
                  <DropdownMenuItem onSelect={handleReactivateClick} disabled={isReactivating}>
                    <Checkmark size={16} className="mr-2" />
                    <span>{isReactivating ? 'Reinstating...' : 'Reinstate Member'}</span>
                  </DropdownMenuItem>
                )}
                {!isDeactivated && canEdit && (
                  <DropdownMenuItem onSelect={handleEditRolesClick}>
                    <Edit size={16} className="mr-2" />
                    <span>Edit Roles</span>
                  </DropdownMenuItem>
                )}
                {!isDeactivated &&
                  (member.fleetDmLabelId || hasDeviceAgentDevice) &&
                  isCurrentUserOwner && (
                    <DropdownMenuItem
                      onSelect={() => {
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
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => {
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
