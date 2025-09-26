'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { useTabState } from './use-tab-state';

interface Props {
  className?: string;
  children: ReactNode;
  tabId: string;
}

export function TabContent({ children, tabId, className }: Props) {
  const [activeTabId] = useTabState();
  return (
    <div className={cn('hidden', { 'flex flex-col': activeTabId === tabId }, className)}>
      {children}
    </div>
  );
}
