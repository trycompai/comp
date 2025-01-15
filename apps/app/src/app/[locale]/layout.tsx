import "@/styles/globals.css";
import { cn } from "@bubba/ui/cn";
import "@bubba/ui/globals.css";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
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

export const preferredRegion = ["fra1", "sfo1", "iad1"];
export const maxDuration = 60;

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
          `${GeistSans.variable} ${GeistMono.variable}`,
          "whitespace-pre-line overscroll-none antialiased",
        )}
      >
        <NuqsAdapter>
          <Providers locale={locale}>
            <NextSSRPlugin routerConfig={extractRouterConfig(fileUploader)} />
            <main>{children}</main>
          </Providers>
        </NuqsAdapter>
        <Toaster richColors />
      </body>
    </html>
  );
}