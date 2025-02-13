import { PolicyOverview } from "@/components/policies/policy-overview";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PolicyPage({ params }: PageProps) {
  const { locale, id } = await params;
  setStaticParamsLocale(locale);

  return <PolicyOverview policyId={id} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sub_pages.policies.editor"),
  };
}
