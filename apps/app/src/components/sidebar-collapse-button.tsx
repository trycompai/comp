'use client';

import { updateSidebarState } from '@/actions/sidebar';
import { useSidebar } from '@/context/sidebar-context';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { ArrowLeftFromLine } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';

interface SidebarCollapseButtonProps {
  isCollapsed: boolean;
}

export function SidebarCollapseButton({ isCollapsed }: SidebarCollapseButtonProps) {
  const { setIsCollapsed } = useSidebar();

  const { execute } = useAction(updateSidebarState, {
    onError: () => {
      // Revert the optimistic update if the server action fails
      setIsCollapsed(isCollapsed);
    },
  });

  const handleToggle = () => {
    // Update local state immediately for responsive UI
    setIsCollapsed(!isCollapsed);
    // Update server state (cookie) in the background
    execute({ isCollapsed: !isCollapsed });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-xs', !isCollapsed && 'mr-4 ml-auto')}
      onClick={handleToggle}
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
