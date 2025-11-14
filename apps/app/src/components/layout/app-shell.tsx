'use client';

import { cn } from '@comp/ui/cn';
import { useEffect, useState } from 'react';

const SIDEBAR_COOKIE_NAME = 'sidebar-collapsed';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function AppShell({ children, sidebar, defaultCollapsed = false }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem(SIDEBAR_COOKIE_NAME);
    if (savedState !== null) {
      setIsCollapsed(savedState === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COOKIE_NAME, String(newState));
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${newState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  };

  return (
    <div
      className="grid h-dvh w-full overflow-hidden md:grid-cols-[80px_1fr]"
      data-sidebar-collapsed={isCollapsed}
    >
      {/* Sidebar Container - Fixed width rail on desktop */}
      <div
        className={cn(
          'bg-card relative hidden overflow-hidden border-r md:block',
          'transition-none', // No transition on container
          // Mobile: full overlay
          'md:w-[80px]',
        )}
      >
        {/* Sidebar Panel - Slides in/out */}
        <aside
          className={cn(
            'bg-card absolute inset-0 w-[240px] overflow-y-auto overflow-x-hidden border-r',
            'transform-gpu transition-transform duration-200 ease-out will-change-transform',
            // Collapsed: slide left so only 80px rail is visible
            isCollapsed && 'md:-translate-x-[160px]',
            // Prevent flash before mount
            !isMounted && 'invisible',
          )}
        >
          {sidebar}
        </aside>

        {/* Toggle button in rail */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'absolute bottom-2 z-10 flex h-8 w-8 items-center justify-center rounded-xs transition-all hover:bg-accent',
            isCollapsed ? 'left-1/2 -translate-x-1/2' : 'right-2',
          )}
          aria-label="Toggle sidebar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'transition-transform duration-200 ease-in-out',
              isCollapsed && 'rotate-180',
            )}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="bg-background overflow-y-auto">{children}</main>
    </div>
  );
}
