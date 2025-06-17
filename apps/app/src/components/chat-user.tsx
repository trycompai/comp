import { Avatar } from '@comp/ui/avatar';
import Image from 'next/image';

type Props = {
  avatarUrl?: string | null;
  fullName?: string | null;
  date?: string | null;
};

export function ChatUser({ avatarUrl, fullName, date }: Props) {
  return (
    <div className="flex items-center gap-2">
      {avatarUrl && (
        <Avatar className="h-8 w-8">
          <Image
            src={avatarUrl}
            alt={fullName ?? ''}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        </Avatar>
      )}
      <div className="flex flex-col">
        {date && <span className="text-muted-foreground text-xs leading-tight">{date}</span>}
      </div>
    </div>
  );
}
