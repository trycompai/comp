'use client';

import type { Invitation } from '@db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HStack,
  TableCell,
  TableRow,
  Text,
} from '@trycompai/design-system';
import { OverflowMenuVertical, TrashCan } from '@trycompai/design-system/icons';
import { useEffect, useState } from 'react';

interface PendingInvitationRowProps {
  invitation: Invitation & {
    role: string;
    createdAt?: Date;
  };
  onCancel: (invitationId: string) => Promise<void>;
  canCancel: boolean;
}

export function PendingInvitationRow({
  invitation,
  onCancel,
  canCancel,
}: PendingInvitationRowProps) {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);

  const handleCancelDialogOpenChange = (open: boolean) => {
    setIsCancelDialogOpen(open);
  };

  const handleOpenCancelDialog = () => {
    setDropdownOpen(false);
    setIsCancelDialogOpen(true);
  };

  const handleCancelClick = () => {
    setPendingRemove(true);
    setIsCancelDialogOpen(false);
  };

  useEffect(() => {
    if (pendingRemove && !isCancelDialogOpen) {
      (async () => {
        setIsCancelling(true);
        await onCancel(invitation.id);
        setIsCancelling(false);
        setPendingRemove(false);
      })();
    }
  }, [pendingRemove, isCancelDialogOpen, onCancel, invitation.id]);

  const roles = Array.isArray(invitation.role)
    ? invitation.role
    : typeof invitation.role === 'string' && invitation.role.includes(',')
      ? invitation.role.split(',')
      : [invitation.role];

  return (
    <>
      <TableRow>
        {/* NAME */}
        <TableCell>
          <HStack gap="3" align="center">
            <Avatar>
              <AvatarFallback>{invitation.email.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Text>{invitation.email}</Text>
            </div>
          </HStack>
        </TableCell>

        {/* STATUS */}
        <TableCell>
          <Badge variant="outline">Pending</Badge>
        </TableCell>

        {/* ROLE */}
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {roles.map((role: string) => (
              <Badge key={role} variant="outline">
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Badge>
            ))}
          </div>
        </TableCell>

        {/* ACTIONS - hidden entirely when user cannot cancel */}
        {canCancel && (
          <TableCell>
            <div className="flex justify-center">
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger
                  variant="ellipsis"
                  disabled={isCancelling}
                  onClick={(e) => e.stopPropagation()}
                >
                  <OverflowMenuVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={handleOpenCancelDialog}>
                    <TrashCan size={16} />
                    Cancel Invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        )}
      </TableRow>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={handleCancelDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation for {invitation.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-muted-foreground mt-1 text-xs">This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancelClick}
              disabled={isCancelling}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
