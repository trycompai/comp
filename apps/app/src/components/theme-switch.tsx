'use client';

import { useTheme } from 'next-themes';

import { ThemeSwitcher } from '@trycompai/design-system';

type Theme = 'dark' | 'system' | 'light';

export const ThemeSwitch = () => {
  const { theme, setTheme, themes } = useTheme();
  const currentTheme = (theme ?? 'system') as Theme;

  return (
    <div className="flex items-center">
      <ThemeSwitcher
        value={currentTheme}
        defaultValue="system"
        onChange={(value) => setTheme(value)}
        showSystem={themes.includes('system')}
        size="sm"
      />
    </div>
  );
};
