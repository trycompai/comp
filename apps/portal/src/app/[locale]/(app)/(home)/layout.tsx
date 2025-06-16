import { getI18n } from "@/app/locales/server";
import { SecondaryMenu } from "@comp/ui/secondary-menu";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getI18n();

  return (
    <>
      <SecondaryMenu items={[{ path: "/", label: t("sidebar.dashboard") }]} />

      <div className="mt-8">{children}</div>
    </>
  );
}
