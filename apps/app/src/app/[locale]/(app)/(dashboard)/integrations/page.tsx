import { auth } from "@/auth";
import { IntegrationsHeader } from "@/components/integrations/integrations-header";
import { IntegrationsServer } from "@/components/integrations/integrations.server";
import { SkeletonLoader } from "@/components/skeleton-loader";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();
  const [organization] = await Promise.all([
    db.organization.findUnique({
      where: {
        id: session?.user.organizationId,
      },
    }),
  ]);

  if (!organization) {
    return redirect("/");
  }

  return (
    <div className="mt-4 max-w-[1200px] m-auto">
      <IntegrationsHeader />

      <Suspense fallback={<SkeletonLoader amount={2} />}>
        <IntegrationsServer />
      </Suspense>
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
    title: t("sidebar.integrations"),
  };
}
