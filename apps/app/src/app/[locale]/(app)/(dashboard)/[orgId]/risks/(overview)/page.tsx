import { AppOnboarding } from "@/components/app-onboarding";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { CreateRiskSheet } from "@/components/sheets/create-risk-sheet";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Departments, RiskStatus } from "@comp/db/types";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";
import { cache } from "react";
import { getRisks } from "./data/getRisks";
import { RisksTable } from "./RisksTable";

export default async function RiskRegisterPage({
	params,
}: {
	params: Promise<{
		orgId: string;
		locale: string;
		search: string;
		page: number;
		pageSize: number;
		status: RiskStatus | null;
		department: Departments | null;
		assigneeId: string | null;
	}>;
}) {
	const {
		orgId,
		locale,
		search,
		page,
		pageSize,
		status,
		department,
		assigneeId,
	} = await params;

	setStaticParamsLocale(locale);
	const t = await getI18n();

	const risks = await getRisks({
		search: search,
		page: page || 1,
		pageSize: pageSize || 10,
		status: status || null,
		department: department || null,
		assigneeId: assigneeId || null,
	});

	const assignees = await getAssignees();

	if (risks.risks?.length === 0) {
		return (
			<>
				<AppOnboarding
					title={t("app_onboarding.risk_management.title")}
					description={t("app_onboarding.risk_management.description")}
					cta={t("app_onboarding.risk_management.cta")}
					imageSrc="/onboarding/risk-management.webp"
					imageAlt="Risk Management"
					sheetName="create-risk-sheet"
					faqs={[
						{
							questionKey: t("app_onboarding.risk_management.faqs.question_1"),
							answerKey: t("app_onboarding.risk_management.faqs.answer_1"),
						},
						{
							questionKey: t("app_onboarding.risk_management.faqs.question_2"),
							answerKey: t("app_onboarding.risk_management.faqs.answer_2"),
						},
						{
							questionKey: t("app_onboarding.risk_management.faqs.question_3"),
							answerKey: t("app_onboarding.risk_management.faqs.answer_3"),
						},
					]}
				/>
				<CreateRiskSheet assignees={assignees} />
			</>
		);
	}

	return (
		<PageWithBreadcrumb
			breadcrumbs={[{ label: "Risks", href: `/${orgId}/risk` }]}
		>
			<RisksTable risks={risks?.risks || []} assignees={assignees} />
		</PageWithBreadcrumb>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("risk.register.title"),
	};
}

const getAssignees = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return [];
	}

	return await db.member.findMany({
		where: {
			organizationId: session.session.activeOrganizationId,
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
