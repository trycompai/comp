"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = Parameters<typeof NextThemesProvider>[0];

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <React.Suspense>{children}</React.Suspense>
    </NextThemesProvider>
  );
}
