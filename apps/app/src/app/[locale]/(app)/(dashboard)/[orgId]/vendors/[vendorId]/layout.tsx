import { auth } from "@/auth";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ vendorId: string }>;
}

export default async function Layout({ children, params }: LayoutProps) {
  const t = await getI18n();
  const session = await auth();

  if (!session || !session.user.organizationId) {
    redirect("/");
  }

  const { vendorId } = await params;

  if (!vendorId) {
    redirect(`/${session.user.organizationId}/vendors`);
  }

  const orgId = session.user.organizationId;

  const vendor = await db.vendor.findUnique({
    where: {
      id: vendorId,
      organizationId: orgId,
    },
  });

  if (!vendor) {
    redirect(`/${orgId}/vendors/register`);
  }

  return (
    <div className="max-w-[1200px] space-y-4 m-auto">
      <SecondaryMenu
        showBackButton
        backButtonHref={`/${orgId}/vendors/register`}
        items={[
          {
            path: `/${orgId}/vendors/${vendorId}`,
            label: vendor.name,
          },
          {
            path: `/${orgId}/vendors/${vendorId}/comments`,
            label: t("common.comments.title"),
          },
        ]}
      />
      <main className="mt-8">{children}</main>
    </div>
  );
}
