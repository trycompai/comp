"use client";

import { env } from "@/env.mjs";
import { AnalyticsProvider } from "@bubba/analytics";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

export function Providers({ children }: ProviderProps) {
  const hasAnalyticsKeys =
    env.NEXT_PUBLIC_POSTHOG_KEY && env.NEXT_PUBLIC_POSTHOG_HOST;

  return (
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
          >
            {children}
          </AnalyticsProvider>
        ) : (
          children
        )}
      </ThemeProvider>
  );
}
