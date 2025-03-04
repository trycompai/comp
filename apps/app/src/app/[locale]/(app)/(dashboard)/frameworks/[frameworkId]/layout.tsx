import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";

interface LayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: LayoutProps) {
  const t = await getI18n();

  return (
    <div className="max-w-[1200px] m-auto">
      <SecondaryMenu items={[{ path: "/", label: t("overview.title") }]} />

      <main className="mt-8">{children}</main>
    </div>
  );
}
