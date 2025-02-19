import { getI18n } from "@/locales/server";

export async function getServerColumnHeaders() {
  const t = await getI18n();

  return {
    name: t("people.table.name"),
    email: t("people.table.email"),
    department: t("people.table.department"),
  };
}
