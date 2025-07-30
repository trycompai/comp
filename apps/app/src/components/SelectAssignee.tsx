import { authClient } from '@/utils/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@comp/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@comp/ui/select';
import { Member, User } from '@db';
import { UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SelectAssigneeProps {
  assigneeId: string | null;
  disabled?: boolean;
  assignees: (Member & { user: User })[];
  onAssigneeChange: (value: string | null) => void;
  withTitle?: boolean;
}

export const SelectAssignee = ({
  assigneeId,
  disabled,
  assignees,
  onAssigneeChange,
  withTitle = true,
}: SelectAssigneeProps) => {
  const { data: activeMember } = authClient.useActiveMember();
  const [selectedAssignee, setSelectedAssignee] = useState<(Member & { user: User }) | null>(null);

  // Initialize selectedAssignee based on assigneeId prop
  useEffect(() => {
    if (assigneeId && assignees) {
      const assignee = assignees.find((a) => a.id === assigneeId);
      if (assignee) {
        setSelectedAssignee(assignee);
      }
    } else {
      setSelectedAssignee(null);
    }
  }, [assigneeId, assignees]);

  const handleAssigneeChange = (value: string) => {
    const newAssigneeId = value === 'none' ? null : value;
    onAssigneeChange(newAssigneeId);

    if (newAssigneeId && assignees) {
      const assignee = assignees.find((a) => a.id === newAssigneeId);
      if (assignee) {
        setSelectedAssignee(assignee);
      } else {
        setSelectedAssignee(null);
      }
    } else {
      setSelectedAssignee(null);
    }
  };

  // Function to safely prepare image URLs
  const getImageUrl = (image: string | null) => {
    if (!image) return '';

    // If image is a relative URL, ensure it's properly formed
    if (image.startsWith('/')) {
      return image;
    }

    return image;
  };

  // Render the none fallback avatar
  const renderNoneAvatar = () => (
    <div className="bg-muted flex h-5 w-5 items-center justify-center rounded-full">
      <UserIcon className="h-3 w-3" />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {withTitle && (
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-medium">Assignee</span>
        </div>
      )}
      <Select value={assigneeId || 'none'} onValueChange={handleAssigneeChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          {selectedAssignee ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage
                  src={getImageUrl(selectedAssignee.user.image)}
                  alt={selectedAssignee.user.name || selectedAssignee.user.email || 'User'}
                />
                <AvatarFallback>
                  {selectedAssignee.user.name?.charAt(0) ||
                    selectedAssignee.user.email?.charAt(0).toUpperCase() ||
                    '?'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {selectedAssignee.user.name || selectedAssignee.user.email || 'Unknown User'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {renderNoneAvatar()}
              <span>None</span>
            </div>
          )}
        </SelectTrigger>
        <SelectContent
          className="z-50 w-auto max-w-[250px] min-w-[var(--radix-select-trigger-width)]"
          position="popper"
          sideOffset={5}
          align="start"
        >
          <SelectItem value="none" className="hover:bg-accent w-full overflow-hidden p-0">
            <div className="flex w-full items-center gap-2 px-3 py-1.5">
              {renderNoneAvatar()}
              <span>None</span>
            </div>
          </SelectItem>
          {assignees.map((assignee) => (
            <SelectItem
              key={assignee.id}
              value={assignee.id}
              className="hover:bg-accent w-full overflow-hidden p-0"
            >
              <div className="flex w-full items-center gap-2 px-3 py-1.5">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage
                    src={getImageUrl(assignee.user.image)}
                    alt={assignee.user.name || assignee.user.email || 'User'}
                  />
                  <AvatarFallback>
                    {assignee.user.name?.charAt(0) ||
                      assignee.user.email?.charAt(0).toUpperCase() ||
                      '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {assignee.user.name || assignee.user.email || 'Unknown User'}{' '}
                  {assignee.id === activeMember?.id && '(You)'}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
