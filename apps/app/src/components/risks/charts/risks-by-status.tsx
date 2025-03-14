import { db } from "@bubba/db";
import { StatusChart } from "./status-chart";
import { unstable_cache } from "next/cache";
import { Card, CardHeader, CardTitle, CardContent } from "@bubba/ui/card";
import { getI18n } from "@/locales/server";

interface Props {
	organizationId: string;
}

export async function RisksByStatus({ organizationId }: Props) {
	const t = await getI18n();

	const risks = await getRisksByStatus(organizationId);

	const data = risks.map((risk) => ({
		name: risk.status,
		value: risk._count,
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("dashboard.risk_status")}</CardTitle>
			</CardHeader>
			<CardContent>
				<StatusChart data={data} />
			</CardContent>
		</Card>
	);
}

const getRisksByStatus = unstable_cache(
	async (organizationId: string) => {
		return await db.risk.groupBy({
			by: ["status"],
			where: { organizationId },
			_count: true,
		});
	},
	["risks-by-status"],
	{ tags: ["risks", "status"] },
);
