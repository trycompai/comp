import { getI18n } from "@/app/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getI18n();

  return (
    <div className="max-w-[1200px]">
      <SecondaryMenu items={[{ path: "/", label: t("sidebar.dashboard") }]} />

      <main className="mt-8">{children}</main>
    </div>
  );
}
