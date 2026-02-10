'use client';

import { Laptop } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

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
import { Edit, OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import type { Role } from '@db';

import { toast } from 'sonner';
import { MultiRoleCombobox, type CustomRoleOption } from './MultiRoleCombobox';
import { RemoveDeviceAlert } from './RemoveDeviceAlert';
import { RemoveMemberAlert } from './RemoveMemberAlert';
import type { MemberWithUser } from './TeamMembers';

interface MemberRowProps {
  member: MemberWithUser;
  onRemove: (memberId: string) => void;
  onRemoveDevice: (memberId: string) => void;
  onUpdateRole: (memberId: string, roles: Role[]) => void;
  canEdit: boolean;
  isCurrentUserOwner: boolean;
  customRoles?: CustomRoleOption[];
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
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'admin':
      return 'Admin';
    case 'auditor':
      return 'Auditor';
    case 'employee':
      return 'Employee';
    case 'contractor':
      return 'Contractor';
    default:
      return '???';
  }
}

function parseRoles(role: Role | Role[] | string): Role[] {
  if (Array.isArray(role)) return role as Role[];
  if (typeof role === 'string' && role.includes(',')) {
    return role.split(',').map((r) => r.trim()) as Role[];
  }
  return [role as Role];
}

export function MemberRow({
  member,
  onRemove,
  onRemoveDevice,
  onUpdateRole,
  canEdit,
  isCurrentUserOwner,
  customRoles = [],
}: MemberRowProps) {
  const { orgId } = useParams<{ orgId: string }>();

  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isUpdateRolesOpen, setIsUpdateRolesOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(() => parseRoles(member.role));
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);

  const memberName = member.user.name || member.user.email || 'Member';
  const memberEmail = member.user.email || '';
  const memberAvatar = member.user.image;
  const memberId = member.id;
  const currentRoles = parseRoles(member.role);

  const isOwner = currentRoles.includes('owner');
  const isPlatformAdmin = member.user.isPlatformAdmin === true;
  const canRemove = !isOwner && !isPlatformAdmin;
  const isDeactivated = member.deactivated || !member.isActive;
  const canViewProfile = !isDeactivated;
  const profileHref = canViewProfile ? `/${orgId}/people/${memberId}` : null;

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
              {profileHref ? (
                <Link
                  href={profileHref}
                  className={`truncate text-sm font-medium hover:underline ${
                    isDeactivated ? 'text-muted-foreground' : ''
                  }`}
                >
                  {memberName}
                </Link>
              ) : (
                <span
                  className={`truncate text-sm font-medium ${
                    isDeactivated ? 'text-muted-foreground' : ''
                  }`}
                >
                  {memberName}
                </span>
              )}
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
          <div className="flex flex-wrap gap-1">
            {isPlatformAdmin && (
              <div className="text-xs whitespace-nowrap text-indigo-700 border-indigo-300 bg-indigo-50 dark:text-indigo-300 dark:border-indigo-700 dark:bg-indigo-950">
                <Badge variant="outline">
                  Comp AI
                </Badge>
              </div>
            )}
            {currentRoles.map((role) => {
              const builtInRoles = ['owner', 'admin', 'auditor', 'employee', 'contractor'];
              const customRole = !builtInRoles.includes(role)
                ? customRoles.find((r) => r.name === role)
                : undefined;

              return (
                <div key={role} className={`text-xs whitespace-nowrap ${isDeactivated ? 'opacity-50' : ''}`}>
                <Badge
                  variant="secondary"
                >
                  {(() => {
                    if (customRole) return customRole.name;
                    switch (role) {
                      case 'owner':
                        return 'Owner';
                      case 'admin':
                        return 'Admin';
                      case 'auditor':
                        return 'Auditor';
                      case 'employee':
                        return 'Employee';
                      case 'contractor':
                        return 'Contractor';
                      default:
                        return role;
                    }
                  })()}
                </Badge>
                </div>
              );
            })}
          </div>
        </TableCell>

        {/* ACTIONS */}
        <TableCell>
          {!isDeactivated && (
            <div className="flex justify-center">
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!canEdit}>
                    <OverflowMenuVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onSelect={handleEditRolesClick}>
                      <Edit size={16} className="mr-2" />
                      <span>Edit Roles</span>
                    </DropdownMenuItem>
                  )}
                  {member.fleetDmLabelId && isCurrentUserOwner && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setDropdownOpen(false);
                        setIsRemoveDeviceAlertOpen(true);
                      }}
                    >
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>Remove Device</span>
                    </DropdownMenuItem>
                  )}
                  {canRemove && (
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
          )}
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
            Are you sure you want to remove all devices for this user{' '}
            <strong>{memberName}</strong>? This will disconnect all devices from the organization.
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
