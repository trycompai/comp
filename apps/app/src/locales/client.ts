"use client";

import { createI18nClient } from "next-international/client";

export const languages = ["en"];

export const {
  useScopedI18n,
  I18nProviderClient,
  useCurrentLocale,
  useChangeLocale,
  useI18n,
} = createI18nClient({
  en: () => import("./en"),
});