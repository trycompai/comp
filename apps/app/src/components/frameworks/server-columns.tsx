import { getI18n } from "@/locales/server";

export async function getServerColumnHeaders() {
	const t = await getI18n();

	return {
		name: t("frameworks.controls.table.control"),
		status: t("frameworks.controls.table.status"),
		artifacts: t("frameworks.controls.table.artifacts"),
	};
}
