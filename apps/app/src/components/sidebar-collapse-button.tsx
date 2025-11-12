'use client';

import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { ArrowLeftFromLine } from 'lucide-react';

export function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar();

  return (
    <div className="flex justify-center py-2">
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-xs', state !== 'collapsed' && 'mr-4 ml-auto')}
        onClick={toggleSidebar}
      >
        <ArrowLeftFromLine
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-400 ease-in-out',
            state === 'collapsed' && 'rotate-180',
          )}
        />
      </Button>
    </div>
  );
}
