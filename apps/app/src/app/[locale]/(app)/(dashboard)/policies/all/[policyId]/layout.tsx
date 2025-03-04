import { auth } from "@/auth";
import { Title } from "@/components/title";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ policyId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const t = await getI18n();
  const session = await auth();

  if (!session || !session.user.organizationId) {
    redirect("/");
  }

  const policyId = await params;
  const policy = await getPolicy(
    policyId.policyId,
    session.user.organizationId,
  );

  if (!policy) {
    redirect("/policies");
  }

  return (
    <div className="max-w-[1200px] space-y-4 m-auto">
      <SecondaryMenu
        showBackButton
        backButtonHref="/policies/all"
        items={[
          {
            path: `/policies/all/${policyId.policyId}`,
            label: t("policies.dashboard.sub_pages.overview"),
          },
          {
            path: `/policies/all/${policyId.policyId}/editor`,
            label: t("policies.dashboard.sub_pages.edit_policy"),
          },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}

const getPolicy = unstable_cache(
  async (policyId: string, organizationId: string) => {
    const policy = await db.organizationPolicy.findUnique({
      where: {
        id: policyId,
        organizationId: organizationId,
      },
      include: {
        policy: true,
      },
    });

    return policy;
  },
  ["policy-cache"],
);
