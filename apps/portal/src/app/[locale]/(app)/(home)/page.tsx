import { getI18n } from "@/app/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";

export default async function Portal({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  return (
    <div>
      <h1>Employee Portal</h1>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sidebar.dashboard"),
  };
}
