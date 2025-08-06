'use client';

import { Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@comp/ui/alert-dialog';
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

import { MultiRoleCombobox } from './MultiRoleCombobox';
import type { MemberWithUser } from './TeamMembers';
import { useGT, T, Var } from 'gt-next';

interface MemberRowProps {
  member: MemberWithUser;
  onRemove: (memberId: string) => void;
  onUpdateRole: (memberId: string, roles: Role[]) => void;
}

// Helper to get initials
function getInitials(name: string | null | undefined, email: string | null | undefined, t: (content: string) => string): string {
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
  return t('??');
}

export function MemberRow({ member, onRemove, onUpdateRole }: MemberRowProps) {
  const params = useParams<{ orgId: string }>();
  const { orgId } = params;
  const t = useGT();

  const [isRemoveAlertOpen, setIsRemoveAlertOpen] = useState(false);
  const [isUpdateRolesOpen, setIsUpdateRolesOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(
    Array.isArray(member.role) ? member.role : ([member.role] as Role[]),
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const dropdownTriggerRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLButtonElement | null>(null);
  const currentUserIsOwner = member.role.includes('owner');

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
  const canEditRoles = true;
  const canRemove = !isOwner;

  const isEmployee = currentRoles.includes('employee');

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

  return (
    <>
      <div className="hover:bg-muted/50 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={memberAvatar || undefined} />
            <AvatarFallback>{getInitials(member.user.name, member.user.email, t)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 font-medium">
              <span>{memberName}</span>
              {isEmployee && (
                <Link
                  href={`/${orgId}/people/${memberId}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  ({t('View Profile')})
                </Link>
              )}
            </div>
            <div className="text-muted-foreground text-sm">{memberEmail}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex max-w-[150px] flex-wrap justify-end gap-1 hidden md:block">
            {currentRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {(() => {
                  switch (role) {
                    case 'owner':
                      return t('Owner');
                    case 'admin':
                      return t('Admin');
                    case 'auditor':
                      return t('Auditor');
                    case 'employee':
                      return t('Employee');
                    default:
                      return '???';
                  }
                })()}
              </Badge>
            ))}
          </div>

          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                ref={dropdownTriggerRef}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={!canEditRoles}
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
              {canEditRoles && (
                <Dialog open={isUpdateRolesOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        handleDialogItemSelect();
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      <span>{t('Edit Roles')}</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('Edit Member Roles')}</DialogTitle>
                      <DialogDescription>
                        <T>
                          Change roles for <Var>{memberName}</Var>
                        </T>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor={`role-${memberId}`}>{t('Roles')}</Label>
                        <MultiRoleCombobox
                          selectedRoles={selectedRoles}
                          onSelectedRolesChange={setSelectedRoles}
                          placeholder={t('Select a role')}
                          lockedRoles={isOwner ? ['owner'] : []}
                        />
                        {isOwner && (
                          <T>
                            <p className="text-muted-foreground mt-1 text-xs">
                              The owner role cannot be removed.
                            </p>
                          </T>
                        )}
                        <T>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Members must have at least one role.
                          </p>
                        </T>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsUpdateRolesOpen(false)}>
                        {t('Cancel')}
                      </Button>
                      <Button
                        onClick={handleUpdateRolesClick}
                        disabled={isUpdating || selectedRoles.length === 0}
                      >
                        {t('Update')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {canRemove && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  onSelect={() => setIsRemoveAlertOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>{t('Remove Member')}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={isRemoveAlertOpen} onOpenChange={setIsRemoveAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Remove Team Member')}</AlertDialogTitle>
            <AlertDialogDescription>
              <T>
                Are you sure you want to remove <Var>{memberName}</Var>? They will no longer have access to this organization.
              </T>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveClick} disabled={isRemoving}>
              {t('Remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
