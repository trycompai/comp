'use client';

import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { useSidebar } from '@comp/ui/sidebar';
import { ArrowLeftFromLine } from 'lucide-react';

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-xs', !isCollapsed && 'mr-4 ml-auto')}
      onClick={toggleSidebar}
    >
      <ArrowLeftFromLine
        className={cn(
          'h-4 w-4 shrink-0 transition-transform duration-400 ease-in-out',
          isCollapsed && 'rotate-180',
        )}
      />
    </Button>
  );
}
