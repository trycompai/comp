'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import * as React from 'react';

import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react';

export type ColorMode = 'light' | 'dark';

export interface ColorModeProviderProps extends React.ComponentProps<typeof ThemeProvider> {}

export function ColorModeProvider(props: ColorModeProviderProps) {
  // Chakra v3 color-mode uses next-themes (see docs).
  // Default is system; store under `theme` in localStorage.
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange defaultTheme="system" {...props} />
  );
}

export function useColorMode() {
  const { resolvedTheme, setTheme } = useTheme();

  const colorMode = (resolvedTheme === 'dark' ? 'dark' : 'light') as ColorMode;

  const toggleColorMode = () => {
    setTheme(colorMode === 'dark' ? 'light' : 'dark');
  };

  const setColorMode = (value: ColorMode) => {
    setTheme(value);
  };

  return { colorMode, toggleColorMode, setColorMode } as const;
}

export function useColorModeValue<T>(lightValue: T, darkValue: T) {
  const { colorMode } = useColorMode();
  return colorMode === 'dark' ? darkValue : lightValue;
}

export function ColorModeButton(
  props: Omit<React.ComponentProps<typeof IconButton>, 'aria-label'>,
) {
  const { toggleColorMode, colorMode } = useColorMode();
  const label = colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <ClientOnly fallback={<Skeleton boxSize="9" borderRadius="md" />}>
      <IconButton aria-label={label} onClick={toggleColorMode} variant="outline" {...props} />
    </ClientOnly>
  );
}

export function LightMode({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange forcedTheme="light">
      {children}
    </ThemeProvider>
  );
}

export function DarkMode({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange forcedTheme="dark">
      {children}
    </ThemeProvider>
  );
}
