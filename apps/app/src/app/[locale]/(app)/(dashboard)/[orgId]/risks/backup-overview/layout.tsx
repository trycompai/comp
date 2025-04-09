import { getI18n } from "@/locales/server";
import { SecondaryMenu } from "@comp/ui/secondary-menu";
import { auth } from "@/utils/auth";
import { AppOnboarding } from "@/components/app-onboarding";
import { db } from "@comp/db";
import { cache, Suspense } from "react";
import { CreateRiskSheet } from "@/components/sheets/create-risk-sheet";
import { headers } from "next/headers";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const t = await getI18n();

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const orgId = session?.session.activeOrganizationId;

	const overview = await getRiskOverview();
	const assignees = await getAssignees();

	if (overview?.risks === 0) {
		return (
			<div className="max-w-[1200px] m-auto">
				<Suspense fallback={<div>Loading...</div>}>
					<div className="mt-8">
						<AppOnboarding
							title={t("app_onboarding.risk_management.title")}
							description={t("app_onboarding.risk_management.description")}
							cta={t("app_onboarding.risk_management.cta")}
							imageSrc="/onboarding/risk-management.webp"
							imageAlt="Risk Management"
							sheetName="create-risk-sheet"
							faqs={[
								{
									questionKey: t(
										"app_onboarding.risk_management.faqs.question_1",
									),
									answerKey: t("app_onboarding.risk_management.faqs.answer_1"),
								},
								{
									questionKey: t(
										"app_onboarding.risk_management.faqs.question_2",
									),
									answerKey: t("app_onboarding.risk_management.faqs.answer_2"),
								},
								{
									questionKey: t(
										"app_onboarding.risk_management.faqs.question_3",
									),
									answerKey: t("app_onboarding.risk_management.faqs.answer_3"),
								},
							]}
						/>
						<CreateRiskSheet assignees={assignees} />
					</div>
				</Suspense>
			</div>
		);
	}

	return (
		<div className="max-w-[1200px] m-auto">
			<Suspense fallback={<div>Loading...</div>}>
				<SecondaryMenu
					items={[
						{ path: `/${orgId}/risk`, label: t("risk.dashboard.title") },
						{
							path: `/${orgId}/risks/register`,
							label: t("risk.register.title"),
						},
					]}
				/>

				<main className="mt-8">{children}</main>
			</Suspense>
		</div>
	);
}

const getAssignees = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return [];
	}

	const activeOrganizationId = session.session.activeOrganizationId;

	return await db.member.findMany({
		where: {
			organizationId: activeOrganizationId,
			isActive: true,
			role: {
				notIn: ["employee"],
			},
		},
		include: {
			user: true,
		},
	});
});

const getRiskOverview = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return { risks: 0 };
	}

	const activeOrganizationId = session.session.activeOrganizationId;

	if (!activeOrganizationId) {
		return { risks: 0 };
	}

	return await db.$transaction(async (tx) => {
		const [risks] = await Promise.all([
			tx.risk.count({
				where: { organizationId: activeOrganizationId },
			}),
		]);

		return {
			risks,
		};
	});
});
