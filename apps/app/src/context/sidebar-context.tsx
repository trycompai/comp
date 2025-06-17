'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({
  children,
  initialIsCollapsed = false,
}: {
  children: React.ReactNode;
  initialIsCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialIsCollapsed);

  // Update state if server value changes
  useEffect(() => {
    setIsCollapsed(initialIsCollapsed);
  }, [initialIsCollapsed]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
