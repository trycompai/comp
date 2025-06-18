import { auth } from '@/app/lib/auth';
import { Avatar, AvatarFallback, AvatarImageNext } from '@comp/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@comp/ui/dropdown-menu';
import { headers } from 'next/headers';
import { Logout } from './logout';
import { ThemeSwitch } from './theme-switch';

// Helper function to get initials
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const names = name.split(' ');
    const firstInitial = names[0]?.charAt(0) ?? '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.charAt(0) : '';
    const initials = `${firstInitial}${lastInitial}`.toUpperCase();
    // Ensure we return something, even if splitting/chartAt fails unexpectedly
    return initials || '?';
  }
  if (email) {
    // Use first letter of email if name is missing
    return email.charAt(0).toUpperCase();
  }
  // Fallback if both name and email are missing
  return '?';
}

export async function UserMenu() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userInitials = getInitials(session?.user?.name, session?.user?.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer rounded-full">
          {session?.user?.image && (
            <AvatarImageNext
              src={session.user.image}
              alt={session?.user?.name ?? 'User Avatar'}
              width={32}
              height={32}
              quality={100}
            />
          )}
          <AvatarFallback>
            <span className="text-xs font-semibold">{userInitials}</span>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        {' '}
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="line-clamp-1 block max-w-[155px] truncate">
                {session?.user?.name}
              </span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {session?.user?.email}
              </span>
            </div>
            <div className="rounded-full border px-3 py-0.5 text-[11px] font-normal">Beta</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex flex-row items-center justify-between p-2">
          <p className="text-sm">Theme</p>
          <ThemeSwitch />
        </div>{' '}
        <DropdownMenuSeparator />
        <Logout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
