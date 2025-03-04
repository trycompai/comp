import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getI18n();

  return (
    <div className="max-w-[1200px] m-auto">
      <SecondaryMenu
        items={[
          { path: "/policies", label: t("policies.dashboard.title") },
          { path: "/policies/all", label: t("policies.dashboard.all") },
        ]}
      />

      <main className="mt-8">{children}</main>
    </div>
  );
}
