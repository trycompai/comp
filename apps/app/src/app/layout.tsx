import '@/styles/globals.css';
import '@comp/ui/globals.css';

import { auth } from '@/utils/auth';
import { cn } from '@comp/ui/cn';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { Providers } from './providers';

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          `${GeistMono.variable} ${font.variable}`,
          'overscroll-none whitespace-pre-line antialiased',
        )}
      >
        <NuqsAdapter>
          <Providers session={session}>
            <main>{children}</main>
          </Providers>
        </NuqsAdapter>
        <Toaster richColors />
      </body>
    </html>
  );
}
