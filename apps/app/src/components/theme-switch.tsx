'use client';

import { useGT } from 'gt-next';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';

type Theme = 'dark' | 'system' | 'light';

type Props = {
  currentTheme?: Theme;
};

const getThemeTranslation = (theme: string, t: (content: string) => string) => {
  switch (theme) {
    case 'dark':
      return t('Dark');
    case 'light':
      return t('Light');
    case 'system':
      return t('System');
    default:
      return theme.charAt(0).toUpperCase() + theme.slice(1);
  }
};

const ThemeIcon = ({ currentTheme }: Props) => {
  switch (currentTheme) {
    case 'dark':
      return <Moon size={12} />;
    case 'system':
      return <Monitor size={12} />;
    default:
      return <Sun size={12} />;
  }
};

export const ThemeSwitch = () => {
  const { theme, setTheme, themes } = useTheme();
  const t = useGT();

  return (
    <div className="relative flex items-center">
      <Select defaultValue={theme} onValueChange={(value: Theme) => setTheme(value)}>
        <SelectTrigger className="h-[32px] w-full bg-transparent py-1.5 pr-3 pl-6 text-xs capitalize outline-hidden">
          <SelectValue placeholder={t('Theme')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme} className="capitalize">
                {getThemeTranslation(theme, t)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="pointer-events-none absolute left-2">
        <ThemeIcon currentTheme={theme as Theme} />
      </div>
    </div>
  );
};
