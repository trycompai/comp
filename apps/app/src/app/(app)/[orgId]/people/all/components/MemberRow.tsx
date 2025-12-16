'use client';

import { Edit, Laptop, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@comp/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { Label } from '@comp/ui/label';
import type { Role } from '@db';

import { toast } from 'sonner';
import { MultiRoleCombobox } from './MultiRoleCombobox';
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
}

// Helper to get initials
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

export function MemberRow({ member, onRemove, onRemoveDevice, onUpdateRole, canEdit, isCurrentUserOwner }: MemberRowProps) {
  const params = useParams<{ orgId: string }>();
  const { orgId } = params;

  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
  const [isRemoveDeviceAlertOpen, setIsRemoveDeviceAlertOpen] = useState(false);
  const [isUpdateRolesOpen, setIsUpdateRolesOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(
    Array.isArray(member.role) ? member.role : ([member.role] as Role[]),
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemovingDevice, setIsRemovingDevice] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLButtonElement | null>(null);

  const memberName = member.user.name || member.user.email || 'Member';
  const memberEmail = member.user.email || '';
  const memberAvatar = member.user.image;
  const memberId = member.id;
  const currentRoles = (
    Array.isArray(member.role)
      ? member.role
      : typeof member.role === 'string' && member.role.includes(',')
        ? (member.role.split(',') as Role[])
        : [member.role]
  ) as Role[];

  const isOwner = currentRoles.includes('owner');
  const canRemove = !isOwner;

  const isEmployee = currentRoles.includes('employee');
  const isContractor = currentRoles.includes('contractor');

  const handleDialogItemSelect = () => {
    focusRef.current = dropdownTriggerRef.current;
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsUpdateRolesOpen(open);
    if (open === false) {
      setDropdownOpen(false);
    }
  };

  const handleUpdateRolesClick = async () => {
    console.log('handleUpdateRolesClick');
    let rolesToUpdate = selectedRoles;
    if (isOwner && !rolesToUpdate.includes('owner')) {
      rolesToUpdate = [...rolesToUpdate, 'owner'];
    }

    // Don't update if no roles are selected
    if (rolesToUpdate.length === 0) {
      return;
    }

    setIsUpdating(true);
    await onUpdateRole(memberId, rolesToUpdate);
    setIsUpdating(false);
    setIsUpdateRolesOpen(false); // Close dialog after update
  };

  const handleRemoveClick = async () => {
    if (!canRemove) return;
    setIsRemoving(true);
    await onRemove(memberId);
    setIsRemoving(false);
    setIsRemoveAlertOpen(false);
  };

  const handleRemoveDeviceClick = async () => {
    try {
      setIsRemovingDevice(true);
      await onRemoveDevice(memberId);
      setIsRemoveDeviceAlertOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unlink device');
    } finally {
      setIsRemovingDevice(false);
    }
  };

  const isDeactivated = member.deactivated;

  return (
    <>
      <div className={`hover:bg-muted/50 flex items-center justify-between p-4 ${isDeactivated ? 'opacity-60' : ''}`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className={`flex-shrink-0 ${isDeactivated ? 'grayscale' : ''}`}>
            <AvatarImage src={memberAvatar || undefined} />
            <AvatarFallback>{getInitials(member.user.name, member.user.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 gap-2">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className={`truncate text-sm font-medium ${isDeactivated ? 'line-through text-muted-foreground' : ''}`}>
                {memberName}
              </span>
              {isDeactivated && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                  Deactivated
                </Badge>
              )}
              {!isDeactivated && (isEmployee || isContractor) && (
                <Link
                  href={`/${orgId}/people/${memberId}`}
                  className="text-xs text-blue-600 hover:underline flex-shrink-0"
                >
                  ({'View Profile'})
                </Link>
              )}
            </div>
            <div className="text-muted-foreground text-sm truncate">{memberEmail}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1 max-w-[120px] sm:max-w-none">
            {currentRoles.map((role) => (
              <Badge key={role} variant="secondary" className={`text-xs whitespace-nowrap ${isDeactivated ? 'opacity-50' : ''}`}>
                {(() => {
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
                })()}
              </Badge>
            ))}
          </div>

          {!isDeactivated && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={dropdownTriggerRef}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={!canEdit}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                hidden={isUpdateRolesOpen}
                onCloseAutoFocus={(event) => {
                  if (focusRef.current) {
                    focusRef.current.focus();
                    focusRef.current = null;
                    event.preventDefault();
                  }
                }}
              >
                {canEdit && (
                  <Dialog open={isUpdateRolesOpen} onOpenChange={handleDialogOpenChange}>
                    <DialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleDialogItemSelect();
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        <span>{'Edit Roles'}</span>
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{'Edit Member Roles'}</DialogTitle>
                        <DialogDescription>
                          {'Change roles for'} {memberName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor={`role-${memberId}`}>{'Roles'}</Label>
                          <MultiRoleCombobox
                            selectedRoles={selectedRoles}
                            onSelectedRolesChange={setSelectedRoles}
                            placeholder={'Select a role'}
                            lockedRoles={isOwner ? ['owner'] : []}
                          />
                          {isOwner && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              {'The owner role cannot be removed.'}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">
                            {'Members must have at least one role.'}
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
                          {'Update'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                {member.fleetDmLabelId && isCurrentUserOwner && (
                  <DropdownMenuItem onSelect={() => setIsRemoveDeviceAlertOpen(true)}>
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>{'Remove Device'}</span>
                  </DropdownMenuItem>
                )}
                {canRemove && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={() => setIsRemoveAlertOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>{'Remove Member'}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <RemoveMemberAlert
        open={isRemoveAlertOpen}
        onOpenChange={setIsRemoveAlertOpen}
        memberName={memberName}
        onRemove={handleRemoveClick}
        isRemoving={isRemoving}
      />
      <RemoveDeviceAlert
        open={isRemoveDeviceAlertOpen}
        onOpenChange={setIsRemoveDeviceAlertOpen}
        memberName={memberName}
        onRemove={handleRemoveDeviceClick}
        isRemoving={isRemovingDevice}
      />
    </>
  );
}
