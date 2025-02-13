import "@/styles/globals.css";
import { cn } from "@bubba/ui/cn";
import "@bubba/ui/globals.css";
import { env } from "@/env.mjs";
import { initializeServer } from "@bubba/analytics/src/server";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import localFont from "next/font/local";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { extractRouterConfig } from "uploadthing/server";
import { fileUploader } from "../api/uploadthing/core";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.trycomp.ai"),
  title: "Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
  description: "Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
  twitter: {
    title: "Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
    description: "Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
    images: [
      {
        url: "https://cdn.trycomp.ai/opengraph-image.jpg",
        width: 800,
        height: 600,
      },
      {
        url: "https://cdn.trycomp.ai/opengraph-image.jpg",
        width: 1800,
        height: 1600,
      },
    ],
  },
  openGraph: {
    title: "Comp AI | Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
    description: "Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
    url: "https://app.trycomp.ai",
    siteName: "Comp AI",
    images: [
      {
        url: "https://cdn.trycomp.ai/opengraph-image.jpg",
        width: 800,
        height: 600,
      },
      {
        url: "https://cdn.trycomp.ai/opengraph-image.jpg",
        width: 1800,
        height: 1600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)" },
    { media: "(prefers-color-scheme: dark)" },
  ],
};

const font = localFont({
  src: "/../../../public/fonts/GeneralSans-Variable.ttf",
  display: "swap",
  variable: "--font-general-sans",
});

export const preferredRegion = ["auto"];
export const maxDuration = 5;

if (env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST) {
  initializeServer({
    apiKey: env.NEXT_PUBLIC_POSTHOG_KEY,
    apiHost: env.NEXT_PUBLIC_POSTHOG_HOST,
  });
}

export default async function Layout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          `${GeistMono.variable} ${font.variable}`,
          "whitespace-pre-line overscroll-none antialiased",
        )}
      >
        <NuqsAdapter>
          <SessionProvider>
            <Providers locale={locale}>
              <NextSSRPlugin routerConfig={extractRouterConfig(fileUploader)} />
              <main>{children}</main>
            </Providers>
          </SessionProvider>
        </NuqsAdapter>
        <Toaster richColors />
      </body>
    </html>
  );
}
