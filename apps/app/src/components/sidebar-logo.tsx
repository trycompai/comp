'use client';

import { cn } from '@comp/ui/cn';
import { Icons } from '@comp/ui/icons';
import { useSidebar } from '@comp/ui/sidebar';
import Link from 'next/link';

export function SidebarLogo() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div
      className={cn(
        'flex items-center transition-all duration-300',
        isCollapsed && 'justify-center',
      )}
    >
      <Link href="/" suppressHydrationWarning>
        <Icons.Logo width={40} height={40} className={cn('transition-transform duration-300')} />
      </Link>
    </div>
  );
}
