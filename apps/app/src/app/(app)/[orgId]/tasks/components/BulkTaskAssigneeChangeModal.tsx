'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@comp/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@comp/ui/dialog';
import { Label } from '@comp/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@comp/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Member, User } from '@db';
import { Loader2, UserIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface BulkTaskAssigneeChangeModalProps {
  open: boolean;
  selectedTaskIds: string[];
  members: (Member & { user: User })[];
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const UnassignedAvatar = () => (
  <div className="bg-muted flex h-5 w-5 items-center justify-center rounded-full">
    <UserIcon className="h-3 w-3" />
  </div>
);

const MemberAvatar = ({ member }: { member: Member & { user: User } }) => (
  <Avatar className="h-5 w-5">
    <AvatarImage src={member.user.image ?? undefined} alt={member.user.name ?? 'Assignee'} />
    <AvatarFallback>
      {member.user.name?.charAt(0) ?? member.user.email?.charAt(0).toUpperCase() ?? '?'}
    </AvatarFallback>
  </Avatar>
);

const MemberDisplayName = ({ member }: { member: Member & { user: User } }) => (
  <span>{member.user.name ?? member.user.email ?? 'Unknown'}</span>
);

export function BulkTaskAssigneeChangeModal({
  open,
  onOpenChange,
  selectedTaskIds,
  members,
  onSuccess,
}: BulkTaskAssigneeChangeModalProps) {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgIdParam = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;

  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCount = selectedTaskIds.length;
  const isSingular = selectedCount === 1;
  const selectedAssignee = useMemo(
    () => (assigneeId ? members.find((m) => m.id === assigneeId) : null),
    [assigneeId, members],
  );

  useEffect(() => {
    if (open) {
      setAssigneeId(null);
    }
  }, [open]);

  const handleAssigneeChange = (value: string) => {
    setAssigneeId(value === 'none' ? null : value);
  };

  const handleUpdate = async () => {
    if (!orgIdParam || selectedTaskIds.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        taskIds: selectedTaskIds,
        assigneeId: assigneeId ?? null,
      };

      const response = await apiClient.patch<{ updatedCount: number }>(
        '/v1/tasks/bulk/assignee',
        payload,
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const updatedCount = response.data?.updatedCount ?? selectedTaskIds.length;
      toast.success(`Updated assignee for ${updatedCount} task${updatedCount === 1 ? '' : 's'}`);
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to bulk update task assignees', error);
      const message = error instanceof Error ? error.message : 'Failed to update tasks';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Assignee Update</DialogTitle>
          <DialogDescription>
            {`${selectedCount} item${isSingular ? '' : 's'} ${
              isSingular ? 'is' : 'are'
            } selected. Are you sure you want to change the assignee?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 flex flex-row items-center gap-4">
          <Label htmlFor="task-assignee">Assignee</Label>
          <Select value={assigneeId || 'none'} onValueChange={handleAssigneeChange}>
            <SelectTrigger id="task-assignee" className="w-full">
              {selectedAssignee ? (
                <div className="flex items-center gap-2">
                  <MemberAvatar member={selectedAssignee} />
                  <MemberDisplayName member={selectedAssignee} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UnassignedAvatar />
                  <span>Unassigned</span>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <UnassignedAvatar />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={member} />
                    <MemberDisplayName member={member} />
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change Assignee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
