import { getI18n } from "@/locales/server";

export async function getServerColumnHeaders() {
  const t = await getI18n();

  return {
    title: t("tests.table.title"),
    provider: t("tests.table.provider"),
    status: t("tests.table.status"),
    lastRun: t("tests.table.lastRun"),
  };
}
