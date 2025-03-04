"use client";

import { I18nProviderClient } from "@/app/locales/client";
import { env } from "@/env.mjs";
import { AnalyticsProvider } from "@bubba/analytics";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
  locale: string;
};

export function Providers({ children, locale }: ProviderProps) {
  const hasAnalyticsKeys =
    env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST;

  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {hasAnalyticsKeys ? (
          <AnalyticsProvider
            apiKey={env.NEXT_PUBLIC_POSTHOG_KEY!}
            apiHost={env.NEXT_PUBLIC_POSTHOG_HOST!}
          >
            {children}
          </AnalyticsProvider>
        ) : (
          children
        )}
      </ThemeProvider>
    </I18nProviderClient>
  );
}
