import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";
import { CloudTestDetails } from "./components/CloudTestDetails";

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; testId: string }>;
}) {
  const { locale, testId } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();
  const organizationId = session?.user.organizationId;

  if (!organizationId) {
    redirect("/");
  }

  return <CloudTestDetails testId={testId} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; testId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sub_pages.people.employee_details"),
  };
}
