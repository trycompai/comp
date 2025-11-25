'use client';

import { AnalyticsProvider } from '@comp/analytics';
import { Toaster } from '@comp/ui/sooner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Session, User } from 'better-auth';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

type ProviderProps = {
  children: ReactNode;
  session: {
    session: Session | null;
    user: User | null;
  } | null;
};

let clientQueryClientSingleton: QueryClient | undefined = undefined;

const getQueryClient = () => {
  if (typeof window === 'undefined') {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
      },
    });
  } else {
    return (clientQueryClientSingleton ??= new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
        },
      },
    }));
  }
};

export function Providers({ children, session }: ProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <AnalyticsProvider
          userId={session?.user?.id ?? undefined}
          userEmail={session?.user?.email ?? undefined}
        >
          {children}
          <Toaster richColors />
        </AnalyticsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
