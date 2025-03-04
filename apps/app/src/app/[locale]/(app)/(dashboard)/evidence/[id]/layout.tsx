import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@bubba/ui/secondary-menu";
import { headers } from "next/headers";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getI18n();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isEvidenceDetails = /\/evidence\/[a-z0-9]+/.test(pathname);
  const pathParts = pathname.split("/");
  const evidenceIndex = pathParts.findIndex((part) => part === "evidence");
  const id =
    evidenceIndex >= 0 && pathParts.length > evidenceIndex + 1
      ? pathParts[evidenceIndex + 1]
      : "";

  return (
    <div className="max-w-[1200px] m-auto">
      <SecondaryMenu
        items={[
          {
            path: `/evidence/${id}`,
            label: t("evidence.overview"),
          },
          { path: `/evidence/${id}/edit`, label: t("evidence.edit") },
        ]}
        showBackButton={isEvidenceDetails}
        backButtonHref="/evidence/list"
        backButtonLabel={t("evidence.dashboard.layout_back_button")}
      />

      <main className="py-4">{children}</main>
    </div>
  );
}
