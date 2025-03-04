"use client";

import { env } from "@/env.mjs";
import { I18nProviderClient } from "@/locales/client";
import { AnalyticsProvider } from "@bubba/analytics";
import { useSession } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
  locale: string;
};

export function Providers({ children, locale }: ProviderProps) {
  const { data: session } = useSession();
  const hasAnalyticsKeys =
    env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST;

  return (
    <I18nProviderClient locale={locale}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        scriptProps={{ "data-cfasync": "false" }}
      >
        {hasAnalyticsKeys ? (
          <AnalyticsProvider
            apiKey={env.NEXT_PUBLIC_POSTHOG_KEY!}
            apiHost={env.NEXT_PUBLIC_POSTHOG_HOST!}
            userId={session?.user?.id}
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
