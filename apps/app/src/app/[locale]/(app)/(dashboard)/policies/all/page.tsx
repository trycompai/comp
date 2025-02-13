import { auth } from "@/auth";
import { getServerColumnHeaders } from "@/components/tables/policies/server-columns";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { Skeleton } from "@bubba/ui/skeleton";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PoliciesTable } from "./Components/PoliciesTable";

export default async function PoliciesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setStaticParamsLocale(locale);

  const session = await auth();

  if (!session?.user?.organizationId) {
    redirect("/onboarding");
  }

  const [columnHeaders, users] = await Promise.all([
    getServerColumnHeaders(),
    db.user.findMany({
      where: {
        organizationId: session.user.organizationId,
        Artifact: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-[48px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      }
    >
      <PoliciesTable columnHeaders={columnHeaders} users={users} />
    </Suspense>
  );
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
    title: t("sub_pages.policies.all"),
  };
}
