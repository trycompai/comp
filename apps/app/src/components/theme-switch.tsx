'use client';

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

  return (
    <div className="relative flex items-center">
      <Select defaultValue={theme} onValueChange={(value: Theme) => setTheme(value)}>
        <SelectTrigger className="h-[32px] w-full bg-transparent py-1.5 pr-3 pl-6 text-xs capitalize outline-hidden">
          <SelectValue placeholder={'Theme'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme} className="capitalize">
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
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
