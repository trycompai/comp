'use client';

import { JwtTokenManager } from '@/components/auth/jwt-token-manager';
import { env } from '@/env.mjs';
import { AnalyticsProvider } from '@comp/analytics';
import { Toaster } from '@comp/ui/sooner';
import { GoogleTagManager } from '@next/third-parties/google';
import {
  defaultShouldDehydrateQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { Session, User } from 'better-auth';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';

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
    // Server: always make a new query client
    return createQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    return (clientQueryClientSingleton ??= createQueryClient());
  }
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        shouldRedactErrors: () => {
          // We should not catch Next.js server errors
          // as that's how Next.js detects dynamic pages
          // so we cannot redact them.
          // Next.js also automatically redacts errors for us
          // with better digests.
          return false;
        },
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });

export function Providers({ children, session }: ProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        scriptProps={{ 'data-cfasync': 'false' }}
      >
        {env.NEXT_PUBLIC_GTM_ID && (
          <GoogleTagManager
            gtmId={env.NEXT_PUBLIC_GTM_ID}
            dataLayer={{
              user_id: session?.user?.id ?? '',
              user_email: session?.user?.email ?? '',
            }}
          />
        )}
        <AnalyticsProvider
          userId={session?.user?.id ?? undefined}
          userEmail={session?.user?.email ?? undefined}
        >
          <JwtTokenManager />
          {children}
          <Toaster richColors />
        </AnalyticsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
