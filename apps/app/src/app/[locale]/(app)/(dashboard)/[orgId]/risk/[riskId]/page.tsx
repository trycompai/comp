import { cache } from "react";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { InherentRiskChart } from "@/components/risks/charts/InherentRiskChart";
import { ResidualRiskChart } from "@/components/risks/charts/ResidualRiskChart";
import { RiskOverview } from "@/components/risks/risk-overview";
import type { RiskTaskType } from "@/components/tables/risk-tasks/columns";
import { getServerColumnHeaders } from "@/components/tables/risk-tasks/server-columns";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { TaskStatus } from "@comp/db/types";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Comments } from "@/components/comments";

interface PageProps {
	searchParams: Promise<{
		search?: string;
		status?: string;
		sort?: string;
		page?: string;
		per_page?: string;
	}>;
	params: Promise<{ riskId: string; locale: string; orgId: string }>;
}

export default async function RiskPage({ searchParams, params }: PageProps) {
	const { riskId, orgId } = await params;
	const risk = await getRisk(riskId);
	const comments = await getComments({ riskId });
	const assignees = await getAssignees();
	const t = await getI18n();

	if (!risk) {
		redirect("/");
	}

	return (
		<PageWithBreadcrumb
			breadcrumbs={[
				{ label: "Risks", href: `/${orgId}/risk` },
				{ label: risk.title, current: true },
			]}
		>
			<div className="flex flex-col gap-4">
				<RiskOverview risk={risk} assignees={assignees} />
				<div className="grid grid-cols-1 gap-4">
					<InherentRiskChart risk={risk} />
					<ResidualRiskChart risk={risk} />
				</div>
				<Comments entityId={riskId} comments={comments} />
			</div>
		</PageWithBreadcrumb>
	);
}

const getRisk = cache(async (riskId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return null;
	}

	const risk = await db.risk.findUnique({
		where: {
			id: riskId,
			organizationId: session.session.activeOrganizationId,
		},
		include: {
			assignee: {
				include: {
					user: true,
				},
			},
		},
	});

	return risk;
});

const getComments = cache(
	async ({
		riskId,
	}: {
		riskId: string;
	}) => {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || !session.session.activeOrganizationId) {
			return [];
		}

		try {
			const comments = await db.comment.findMany({
				where: {
					entityId: riskId,
					organizationId: session.session.activeOrganizationId,
				},
				include: {
					author: {
						include: {
							user: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			return comments;
		} catch (error) {
			console.error(error);
			return [];
		}
	},
);

const getAssignees = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return [];
	}

	const assignees = await db.member.findMany({
		where: {
			organizationId: session.session.activeOrganizationId,
			role: {
				notIn: ["employee"],
			},
		},
		include: {
			user: true,
		},
	});

	return assignees;
});

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	setStaticParamsLocale(locale);
	const t = await getI18n();

	return {
		title: t("risk.risk_overview"),
	};
}
