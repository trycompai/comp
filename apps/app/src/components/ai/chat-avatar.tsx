'use client';

import { useSession } from '@/utils/auth-client';
import { Avatar, AvatarFallback, AvatarImageNext } from '@comp/ui/avatar';
import { Icons } from '@comp/ui/icons';

type Props = {
  participantType: 'assistant' | 'user';
  ariaLabel?: string;
};

export function ChatAvatar({ participantType, ariaLabel }: Props) {
  const { data: session } = useSession();

  switch (participantType) {
    case 'user': {
      return (
        <Avatar className="size-6" aria-label={ariaLabel}>
          <AvatarImageNext
            src={session?.user?.image || ''}
            alt={session?.user?.name || ''}
            width={24}
            height={24}
          >
            <AvatarFallback>{session?.user?.name?.split(' ').at(0)?.charAt(0)}</AvatarFallback>
          </AvatarImageNext>
        </Avatar>
      );
    }

    default:
      return <Icons.Logo aria-label={ariaLabel} />;
  }
}
