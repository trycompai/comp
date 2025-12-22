'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@trycompai/ui-shadcn';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Logout } from './logout';

interface UserMenuClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  userInitials: string;
}

export function UserMenuClient({ user, userInitials }: UserMenuClientProps) {
  const { theme, setTheme } = useTheme();
  const current = (theme ?? 'system') as 'dark' | 'system' | 'light';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Open user menu"
        className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground"
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? 'User avatar'}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold">{userInitials}</span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name ?? 'Account'}</p>
            {user?.email ? (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <div className="flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System
              </span>
              {current === 'system' ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <div className="flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </span>
              {current === 'light' ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <div className="flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </span>
              {current === 'dark' ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
            </div>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <Logout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
