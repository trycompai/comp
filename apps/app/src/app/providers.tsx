'use client';

import { JwtTokenManager } from '@/components/auth/jwt-token-manager';
import { env } from '@/env.mjs';
import { AnalyticsProvider } from '@comp/analytics';
import { GoogleTagManager } from '@next/third-parties/google';
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

export function Providers({ children, session }: ProviderProps) {
  return (
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
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
