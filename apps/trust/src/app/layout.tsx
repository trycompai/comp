import { Toaster } from '@comp/ui/toaster';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import '@comp/ui/globals.css';
import localFont from 'next/font/local';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@comp/ui/cn';

export const metadata: Metadata = {
  title: 'Comp AI - Trust Portal',
  description: 'Trust Portal',
};

const font = localFont({
  src: '/../../public/fonts/GeneralSans-Variable.ttf',
  display: 'swap',
  variable: '--font-general-sans',
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className={cn(
          `${GeistMono.variable} ${font.variable}`,
          'overscroll-none whitespace-pre-line antialiased',
        )}
      >
        <div className="container mx-auto flex min-h-screen flex-col">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
