import '@/styles/globals.css';
import '@trycompai/design-system/globals.css';

import { auth } from '@/app/lib/auth';
import { env } from '@/env.mjs';
import { initializeServer } from '@comp/analytics/server';
import { cn } from '@trycompai/design-system';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense } from 'react';
import { Toaster } from 'sonner';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://portal.trycomp.ai'),
  title: 'Comp AI | Employee Portal',
  description: 'Enter your email and one time password to continue',
  twitter: {
    title: 'Comp AI | Employee Portal',
    description: 'Enter your email and one time password to continue',
    images: [
      {
        url: 'https://cdn.trycomp.ai/opengraph-image.jpg',
        width: 800,
        height: 600,
      },
      {
        url: 'https://cdn.trycomp.ai/opengraph-image.jpg',
        width: 1800,
        height: 1600,
      },
    ],
  },
  openGraph: {
    title: 'Comp AI | Employee Portal',
    description: 'Enter your email and one time password to continue',
    url: 'https://portal.trycomp.ai',
    siteName: 'Comp AI',
    images: [
      {
        url: 'https://cdn.trycomp.ai/opengraph-image.jpg',
        width: 800,
        height: 600,
      },
      {
        url: 'https://cdn.trycomp.ai/opengraph-image.jpg',
        width: 1800,
        height: 1600,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)' },
    { media: '(prefers-color-scheme: dark)' },
  ],
};

export const preferredRegion = ['auto'];

if (env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST) {
  initializeServer({
    apiKey: env.NEXT_PUBLIC_POSTHOG_KEY,
    apiHost: env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

export default async function Layout(props: { children: React.ReactNode }) {
  const { children } = props;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          // `variable` only defines the CSS variables. `className` actually applies the font-family.
          `${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable}`,
          'overscroll-none whitespace-pre-line antialiased',
        )}
      >
        <Suspense>
          <NuqsAdapter>
            <Providers session={session}>
              <main>{children}</main>
            </Providers>
          </NuqsAdapter>
        </Suspense>
        <Toaster richColors />
      </body>
    </html>
  );
}
