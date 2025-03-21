import { auth } from "@/auth";
import { RiskOverview } from "@/components/risks/charts/risk-overview";
import { RisksAssignee } from "@/components/risks/charts/risks-assignee";
import { getI18n } from "@/locales/server";
import { db } from "@bubba/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";

export default async function RiskManagement({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setStaticParamsLocale(locale);

	const session = await auth();

	if (!session?.user?.organizationId) {
		redirect("/onboarding");
	}

	const overview = await getRiskOverview(session.user.organizationId);
	const orgId = session.user.organizationId;

	if (overview?.risks === 0) {
		redirect(`/${orgId}/risk/register`);
	}

	return (
		<div className="space-y-4 sm:space-y-8">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<RiskOverview organizationId={orgId} />
			</div>

			<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
				<RisksAssignee organizationId={orgId} />
			</div>
		</div>
	);
}

const getRiskOverview = async (organizationId: string) => {
	return await db.$transaction(async (tx) => {
		const [risks] = await Promise.all([
			tx.risk.count({
				where: { organizationId },
			}),
		]);

		return {
			risks,
		};
	});
};

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("sidebar.risk"),
	};
}
