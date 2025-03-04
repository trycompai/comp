import { auth } from "@/auth";
import { Title } from "@/components/title";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ riskId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const t = await getI18n();
  const session = await auth();

  if (!session || !session.user.organizationId) {
    redirect("/");
  }

  const riskId = await params;
  const risk = await getRisk(riskId.riskId, session.user.organizationId);

  if (!risk) {
    redirect("/risk");
  }

  return (
    <div className="max-w-[1200px] space-y-4 m-auto">
      <SecondaryMenu
        showBackButton
        backButtonHref="/risk/register"
        items={[
          { path: `/risk/${riskId.riskId}`, label: t("risk.overview") },
          {
            path: `/risk/${riskId.riskId}/comments`,
            label: t("common.comments.title"),
          },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}

const getRisk = unstable_cache(
  async (riskId: string, organizationId: string) => {
    const risk = await db.risk.findUnique({
      where: {
        id: riskId,
        organizationId: organizationId,
      },
    });

    return risk;
  },
  ["risk-cache"],
);
