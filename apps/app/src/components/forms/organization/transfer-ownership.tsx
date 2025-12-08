'use client';

import { useApi } from '@/hooks/use-api';
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
import { Button } from '@comp/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@comp/ui/card';
import { Input } from '@comp/ui/input';
import { Label } from '@comp/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Member {
  id: string;
  user: {
    name: string | null;
    email: string;
  };
}

interface TransferOwnershipProps {
  members: Member[];
  isOwner: boolean;
}

export function TransferOwnership({ members, isOwner }: TransferOwnershipProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const router = useRouter();
  const api = useApi();

  const handleTransfer = () => {
    if (!selectedMemberId) {
      toast.error('Please select a new owner');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmTransfer = async () => {
    if (!selectedMemberId) return;

    setIsTransferring(true);

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
      }>('/v1/organization/transfer-ownership', {
        newOwnerId: selectedMemberId,
      });

      if (response.error || !response.data?.success) {
        // Check for error in response.error (non-200 responses) or response.data.message (200 with success: false)
        const errorMessage = response.error || response.data?.message || 'Failed to transfer ownership';
        toast.error(errorMessage);
        return;
      }

      toast.success('Ownership transferred successfully. You are now an admin.');
      setSelectedMemberId('');
      setShowConfirmDialog(false);
      setConfirmationText('');
      router.refresh();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error('Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  // Don't show this section if user is not the owner
  if (!isOwner) {
    return null;
  }

  // Show message if there are no other members to transfer to
  if (members.length === 0) {
    return (
      <Card className="border-destructive border border-2">
        <CardHeader>
          <CardTitle>Transfer ownership</CardTitle>
          <CardDescription>
            <div className="max-w-[600px]">
              Transfer the ownership of this organization to another member. You will become an
              admin after the transfer.
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You need to add other members to your organization before you can transfer ownership.
            Invite team members from the People section.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-destructive border border-2">
        <CardHeader>
          <CardTitle>Transfer ownership</CardTitle>
          <CardDescription>
            <div className="max-w-[600px]">
              Transfer the ownership of this organization to another member. You will become an
              admin after the transfer.
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="md:max-w-[300px]">
              <SelectValue placeholder="Select new owner" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.user.name || member.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-muted-foreground text-xs">
            This action cannot be undone without the new owner transferring back.
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleTransfer}
            disabled={!selectedMemberId || isTransferring}
            className="hover:bg-destructive/90"
          >
            {isTransferring ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Transfer ownership
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will transfer ownership of the organization to the selected member. You will
              become an admin and will no longer have owner privileges. This action cannot be
              undone without the new owner transferring ownership back to you.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor="confirm-transfer">Type &apos;transfer&apos; to confirm</Label>
            <Input
              id="confirm-transfer"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="transfer"
            />
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel onClick={() => setConfirmationText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmTransfer}
              disabled={confirmationText !== 'transfer' || isTransferring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isTransferring ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Transfer ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

