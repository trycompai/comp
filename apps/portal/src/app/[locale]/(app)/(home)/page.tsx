import EmployeePortal from "@/app/components/overview/portal";
import { auth } from "@/app/lib/auth";
import { getI18n } from "@/app/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";

export default async function Portal({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <EmployeePortal user={session?.user ?? null} />;
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
