import { auth } from "@/utils/auth";
import { getI18n } from "@/locales/server";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { redirect } from "next/navigation";
import { VendorsTable } from "./components/VendorsTable";
import { Departments, VendorStatus } from "@comp/db/types";
import { z } from "zod";
import { headers } from "next/headers";
import { getServersideSession } from "@/lib/get-session";
import { cache } from "react";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { CreateVendorSheet } from "../components/create-vendor-sheet";
import { AppOnboarding } from "@/components/app-onboarding";

export default async function Page({
	searchParams,
	params,
}: {
	searchParams: Promise<{
		createVendorSheet?: string;
		page?: string;
		pageSize?: string;
		status?: string;
		department?: string;
		assigneeId?: string;
	}>;
	params: Promise<{ orgId: string }>;
}) {
	const t = await getI18n();
	const { orgId } = await params;
	const vendors = await getVendors(searchParams);
	const assignees = await getAssignees();

	if (vendors.length === 0) {
		return (
			<>
				<AppOnboarding
					title={t("app_onboarding.vendors.title")}
					description={t("app_onboarding.vendors.description")}
					cta={t("app_onboarding.vendors.cta")}
					imageSrc="/onboarding/vendor-management.webp"
					imageAlt="Vendor Management"
					sheetName="createVendorSheet"
					faqs={[
						{
							questionKey: t("app_onboarding.vendors.faqs.question_1"),
							answerKey: t("app_onboarding.vendors.faqs.answer_1"),
						},
						{
							questionKey: t("app_onboarding.vendors.faqs.question_2"),
							answerKey: t("app_onboarding.vendors.faqs.answer_2"),
						},
						{
							questionKey: t("app_onboarding.vendors.faqs.question_3"),
							answerKey: t("app_onboarding.vendors.faqs.answer_3"),
						},
					]}
				/>
				<CreateVendorSheet assignees={assignees} />
			</>
		);
	}

	return (
		<PageWithBreadcrumb
			breadcrumbs={[
				{ label: "Vendors", href: `/${orgId}/vendors`, current: true },
			]}
		>
			<VendorsTable assignees={assignees} data={vendors} />
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
		title: t("vendors.register.title"),
	};
}

const getVendors = cache(
	async (
		searchParams: Promise<{
			createVendorSheet?: string;
			page?: string;
			pageSize?: string;
			status?: string;
			department?: string;
			assigneeId?: string;
		}>,
	) => {
		const session = await getServersideSession({
			headers: await headers(),
		});

		if (!session?.session.activeOrganizationId) {
			return [];
		}
		const searchParamsSchema = z.object({
			createVendorSheet: z.string().optional(),
			page: z.string().regex(/^\d+$/).transform(Number).optional(),
			pageSize: z.string().regex(/^\d+$/).transform(Number).optional(),
			status: z.nativeEnum(VendorStatus).optional(),
			department: z.nativeEnum(Departments).optional(),
			assigneeId: z.string().uuid().optional(),
		});

		const result = searchParamsSchema.safeParse(await searchParams);

		if (!result.success) {
			console.error("Invalid search params:", result.error);
			return [];
		}

		const { page, pageSize, status, department, assigneeId } = result.data;

		const vendors = await db.vendor.findMany({
			where: {
				organizationId: session.session.activeOrganizationId,
				...(status && { status: status }),
				...(department && { department: department }),
				...(assigneeId && { assigneeId: assigneeId }),
			},
			include: {
				assignee: {
					select: {
						user: true,
					},
				},
			},
			skip: page ? (Number(page) - 1) * Number(pageSize || 10) : 0,
			take: Number(pageSize || 10),
		});

		return vendors;
	},
);

const getAssignees = cache(async () => {
	const {
		session: { activeOrganizationId },
	} = await getServersideSession({
		headers: await headers(),
	});

	if (!activeOrganizationId) {
		return [];
	}

	const assignees = await db.member.findMany({
		where: {
			organizationId: activeOrganizationId,
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
