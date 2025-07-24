'use client';

import { AnalyticsProvider } from '@comp/analytics';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

type ProviderProps = {
  children: ReactNode;
};

export function Providers({ children }: ProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </ThemeProvider>
  );
}
