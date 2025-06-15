"use client";

import { AnalyticsProvider } from "@comp/analytics";
import { GoogleTagManager } from "@next/third-parties/google";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

export function Providers({ children }: ProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      scriptProps={{ "data-cfasync": "false" }}
      defaultTheme="dark"
      enableSystem={false}
    >
      <GoogleTagManager
        gtmId="GTM-56GW3TVW"
        dataLayer={{
          user_id: "",
          user_email: "",
        }}
      />
      <GoogleTagManager
        gtmId="AW-16886441131"
        dataLayer={{
          user_id: "",
          user_email: "",
        }}
      />
      <AnalyticsProvider userId={undefined} userEmail={undefined}>
        {children}
      </AnalyticsProvider>
    </ThemeProvider>
  );
}
