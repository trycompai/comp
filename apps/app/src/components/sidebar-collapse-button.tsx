'use client';

import { useSidebar } from '@/context/sidebar-context';
import { Button } from '@comp/ui/button';
import { cn } from '@comp/ui/cn';
import { ArrowLeftFromLine } from 'lucide-react';

export function SidebarCollapseButton() {
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const handleToggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    // Persist via cookie (1 year expiry)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `sidebar-collapsed=${JSON.stringify(next)};path=/;expires=${expires.toUTCString()}`;
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
