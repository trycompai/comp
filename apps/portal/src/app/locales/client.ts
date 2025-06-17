'use client';

import { createI18nClient } from 'next-international/client';

export const { useI18n, useScopedI18n, I18nProviderClient, useCurrentLocale, useChangeLocale } =
  createI18nClient({
    en: () => import('./en'),
    es: () => import('./es'),
    fr: () => import('./fr'),
    no: () => import('./no'),
    pt: () => import('./pt'),
  });

export const languages = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  no: 'Norsk',
  pt: 'Português',
} as const;
