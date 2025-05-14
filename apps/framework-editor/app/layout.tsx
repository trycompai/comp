import { Toaster } from '@comp/ui/toaster';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import { MenuTabs } from './components/MenuTabs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import Toolbar from './components/Toolbar';

import "@comp/ui/globals.css";
import '../styles/globals.css';
import 'react-datasheet-grid/dist/style.css'

export const metadata: Metadata = {
  title: 'Comp AI - Framework Editor',
  description: 'Edit your framework',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className="h-full">
        <body>
          <NuqsAdapter>
            <div className="flex flex-col w-screen p-4 gap-2 h-full">
              <Toolbar/>
              <MenuTabs />
              {children}
              <Toaster />
            </div>
          </NuqsAdapter>
        </body>
    </html>
  )
}
