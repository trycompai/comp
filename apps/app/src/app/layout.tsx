import '@/styles/globals.css';
import '@comp/ui/globals.css';

import { LinkedInInsight } from '@/components/tracking/LinkedInInsight';
import { env } from '@/env.mjs';
import { auth } from '@/utils/auth';
import { cn } from '@comp/ui/cn';
import { Analytics as DubAnalytics } from '@dub/analytics/react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { Providers } from './providers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL('https://app.trycomp.ai'),
  title: 'Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
  description: 'Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
  twitter: {
    title: 'Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
    description: 'Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
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
    title: 'Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
    description: 'Automate SOC 2, ISO 27001 and GDPR compliance with AI.',
    url: 'https://app.trycomp.ai',
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

const font = localFont({
  src: '/../../public/fonts/GeneralSans-Variable.ttf',
  display: 'swap',
  variable: '--font-general-sans',
});

export const preferredRegion = ['auto'];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const dubIsEnabled = env.DUB_API_KEY !== undefined;
  const dubReferUrl = env.DUB_REFER_URL;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {dubIsEnabled && dubReferUrl && (
          <DubAnalytics
            domainsConfig={{
              refer: dubReferUrl,
            }}
          />
        )}
      </head>
      <body
        className={cn(
          `${GeistMono.variable} ${font.variable}`,
          'overscroll-none whitespace-pre-line antialiased',
        )}
      >
        {env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID && (
          <LinkedInInsight partnerId={env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID} />
        )}
        <NuqsAdapter>
          <Providers session={session}>
            <main>{children}</main>
          </Providers>
        </NuqsAdapter>
        <Toaster richColors />
        <VercelAnalytics />
      </body>
    </html>
  );
}
