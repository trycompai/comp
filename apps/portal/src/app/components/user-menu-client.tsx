'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@trycompai/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@trycompai/ui/dropdown-menu';
import { Logout } from './logout';

type UserMenuClientProps = {
  name: string | null;
  email: string | null;
  image: string | null;
  userInitials: string;
};

export function UserMenuClient({ name, email, image, userInitials }: UserMenuClientProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {image ? <AvatarImage src={image} alt={name ?? 'User Avatar'} /> : null}
          <AvatarFallback>
            <span className="text-xs font-semibold">{userInitials}</span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="line-clamp-1 block max-w-[155px] truncate">{name}</span>
              <span className="text-muted-foreground truncate text-xs font-normal">{email}</span>
            </div>
            <div className="rounded-full border px-3 py-0.5 text-[11px] font-normal">Beta</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Logout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
