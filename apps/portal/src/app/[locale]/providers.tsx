'use client';

import { I18nProviderClient } from '@/app/locales/client';
import { AnalyticsProvider } from '@comp/analytics';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

type ProviderProps = {
  children: ReactNode;
  locale: string;
};

export function Providers({ children, locale }: ProviderProps) {
  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </ThemeProvider>
    </I18nProviderClient>
  );
}
