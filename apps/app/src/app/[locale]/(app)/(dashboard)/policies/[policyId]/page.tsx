import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";

export default async function PolicyDetails({
  params,
}: {
  params: Promise<{ locale: string; policyId: string }>;
}) {
  const { locale, policyId } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();
  const organizationId = session?.user.organizationId;

  if (!organizationId) {
    redirect("/");
  }

  return <>Hi</>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; policyId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sub_pages.policies.policy_details"),
  };
}
