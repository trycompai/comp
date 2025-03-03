import { getI18n } from "@/locales/server";

export async function getServerColumnHeaders() {
  const t = await getI18n();

  return {
    severity: t("tests.table.severity"),
    result: t("tests.table.result"),
    title: t("tests.table.title"),
    provider: t("tests.table.provider"),
    status: t("tests.table.status"),
    createdAt: t("tests.table.createdAt"),
    assignedUser: t("tests.table.assignedUser"),
  };
}
