import { Avatar, AvatarFallback, AvatarImageNext } from '@comp/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { headers } from 'next/headers';
import { SignOut } from './sign-out';
import { auth } from '../lib/auth';

export async function UserMenu({ onlySignOut }: { onlySignOut?: boolean }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {session?.user?.image && (
            <AvatarImageNext
              src={session?.user?.image}
              alt={session?.user?.name ?? session?.user?.email ?? ''}
              width={32}
              height={32}
              quality={100}
            />
          )}
          <AvatarFallback>
            <span className="text-xs">
              {session?.user?.name?.charAt(0)?.toUpperCase() ||
                session?.user?.email?.charAt(0)?.toUpperCase()}
            </span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        {!onlySignOut && (
          <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="line-clamp-1 block max-w-[155px] truncate">
                  {session?.user?.name}
                </span>
                <span className="truncate text-xs font-normal text-[#606060]">
                  {session?.user?.email}
                </span>
              </div>
              <div className="rounded-full border px-3 py-0.5 text-[11px] font-normal">Beta</div>
            </div>
          </DropdownMenuLabel>
        )}

        <SignOut />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
