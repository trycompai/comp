import { Avatar } from '@comp/ui/avatar';
import Image from 'next/image';

type Props = {
  avatarUrl?: string | null;
  fullName?: string | null;
  date?: string | null;
};

export function AssignedUser({ avatarUrl, fullName, date }: Props) {
  return (
    <div className="flex items-center gap-2">
      {avatarUrl && (
        <Avatar className="h-6 w-6">
          <Image
            src={avatarUrl}
            alt={fullName ?? ''}
            width={24}
            height={24}
            className="rounded-full object-cover"
          />
        </Avatar>
      )}
      <div className="flex flex-col">
        <span className="text-foreground text-sm font-medium">{fullName}</span>
        {date && <span className="text-muted-foreground text-xs leading-tight">{date}</span>}
      </div>
    </div>
  );
}
