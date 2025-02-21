import { auth } from "@/auth";
import { getServerColumnHeaders } from "@/components/tables/tests/server-columns";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";
import { TestsList } from "./components/TestsList";

export default async function TestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();
  const organizationId = session?.user.organizationId;

  if (!organizationId) {
    return redirect("/");
  }

  const columnHeaders = await getServerColumnHeaders();

  return <TestsList columnHeaders={columnHeaders} />;
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
    title: t("sidebar.tests"),
  };
}
