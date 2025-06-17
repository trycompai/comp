'use client';

import { useChangeLocale, useCurrentLocale, useI18n } from '@/app/locales/client';
import { languages } from '@/app/locales/client';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@comp/ui/select';
import { Globe } from 'lucide-react';

export const LocaleSwitch = () => {
  const t = useI18n();
  const locale = useCurrentLocale();
  const changeLocale = useChangeLocale();

  return (
    <div className="relative flex items-center">
      <Select
        defaultValue={locale}
        onValueChange={(value: keyof typeof languages) => changeLocale(value)}
      >
        <SelectTrigger className="h-[32px] w-full bg-transparent py-1.5 pr-3 pl-6 text-xs capitalize outline-hidden">
          <SelectValue placeholder={t('language.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {Object.entries(languages).map(([code, name]) => (
              <SelectItem key={code} value={code} className="capitalize">
                {name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <div className="pointer-events-none absolute left-2">
        <Globe size={12} />
      </div>
    </div>
  );
};
