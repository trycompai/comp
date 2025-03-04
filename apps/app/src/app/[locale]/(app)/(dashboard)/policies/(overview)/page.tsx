import { auth } from "@/auth";
import { PoliciesStatus } from "@/components/policies/charts/policies-status";
import { PoliciesByAssignee } from "@/components/policies/charts/policies-by-assignee";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

export default async function PoliciesOverview({
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

  const overview = await getPoliciesOverview(session.user.organizationId);

  if (overview?.totalPolicies === 0) {
    redirect("/policies/all");
  }

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PoliciesStatus
          totalPolicies={overview.totalPolicies}
          publishedPolicies={overview.publishedPolicies}
          draftPolicies={overview.draftPolicies}
          archivedPolicies={overview.archivedPolicies}
          needsReviewPolicies={overview.needsReviewPolicies}
        />
        <PoliciesByAssignee organizationId={session.user.organizationId} />
      </div>
    </div>
  );
}
const getPoliciesOverview = unstable_cache(
  async (organizationId: string) => {
    return await db.$transaction(async (tx) => {
      const [
        totalPolicies,
        publishedPolicies,
        draftPolicies,
        archivedPolicies,
        needsReviewPolicies,
      ] = await Promise.all([
        tx.organizationPolicy.count({
          where: {
            organizationId,
          },
        }),
        tx.organizationPolicy.count({
          where: {
            organizationId,
            status: "published",
          },
        }),
        tx.organizationPolicy.count({
          where: {
            organizationId,
            status: "draft",
          },
        }),
        tx.organizationPolicy.count({
          where: {
            organizationId,
            status: "archived",
          },
        }),
        tx.organizationPolicy.count({
          where: {
            organizationId,
            status: "needs_review",
          },
        }),
      ]);

      return {
        totalPolicies,
        publishedPolicies,
        draftPolicies,
        archivedPolicies,
        needsReviewPolicies,
      };
    });
  },
  ["policies-overview-cache"],
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setStaticParamsLocale(locale);
  const t = await getI18n();

  return {
    title: t("sidebar.policies"),
  };
}
