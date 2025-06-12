import { Toaster } from '@comp/ui/toaster';
import type { Metadata } from 'next';
import { type ReactNode } from 'react';
import "@comp/ui/globals.css";
import localFont from 'next/font/local';
import { GeistMono } from "geist/font/mono";
import { cn } from '@comp/ui/cn';

export const metadata: Metadata = {
    title: 'Comp AI - Trust Portal',
    description: 'Trust Portal',
}

const font = localFont({
    src: "/../../public/fonts/GeneralSans-Variable.ttf",
    display: "swap",
    variable: "--font-general-sans",
});

export default function RootLayout({
    children,
}: {
    children: ReactNode
}) {
    return (
        <html lang="en">
            <body
                className={cn(
                    `${GeistMono.variable} ${font.variable}`,
                    "whitespace-pre-line overscroll-none antialiased",
                )}
            >
                <div className="flex flex-col container min-h-screen mx-auto">
                    {children}
                </div>
                <Toaster />
            </body>
        </html>
    )
}
