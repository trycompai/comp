import { getI18n } from "@/locales/server";

export async function getServerColumnHeaders() {
	const t = await getI18n();

	return {
		name: t("policies.table.name"),
		status: t("common.status.title"),
		updatedAt: t("common.last_updated"),
	};
}
