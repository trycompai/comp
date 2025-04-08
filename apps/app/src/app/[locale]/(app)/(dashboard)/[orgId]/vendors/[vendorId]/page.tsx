"use server";

import { Comments } from "@/components/comments";
import PageWithBreadcrumb from "@/components/pages/PageWithBreadcrumb";
import { getI18n } from "@/locales/server";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Metadata } from "next";
import { setStaticParamsLocale } from "next-international/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { VendorInherentRiskChart } from "./components/VendorInherentRiskChart";
import { VendorResidualRiskChart } from "./components/VendorResidualRiskChart";
import { SecondaryFields } from "./components/secondary-fields/secondary-fields";
import { TitleAndDescription } from "./components/title-and-description/title-and-description";

interface PageProps {
	params: Promise<{ vendorId: string; locale: string; orgId: string }>;
}

export default async function VendorPage({ params }: PageProps) {
	const { vendorId, orgId } = await params;
	const vendor = await getVendor(vendorId);
	const assignees = await getAssignees();
	const comments = await getComments({ vendorId });

	if (!vendor) {
		redirect("/");
	}

	return (
		<PageWithBreadcrumb
			breadcrumbs={[
				{ label: "Vendors", href: `/${orgId}/vendors` },
				{ label: vendor.name, current: true },
			]}
		>
			<div className="flex flex-col gap-4">
				<TitleAndDescription vendor={vendor} />
				<SecondaryFields vendor={vendor} assignees={assignees} />
				<div className="grid grid-cols-1 gap-4">
					<VendorInherentRiskChart vendor={vendor} />
					<VendorResidualRiskChart vendor={vendor} />
				</div>
				<Comments entityId={vendorId} comments={comments} />
			</div>
		</PageWithBreadcrumb>
	);
}

const getVendor = cache(async (vendorId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return null;
	}

	const vendor = await db.vendor.findUnique({
		where: {
			id: vendorId,
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

	return vendor;
});

const getComments = cache(
	async ({
		vendorId,
	}: {
		vendorId: string;
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
					entityId: vendorId,
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
		title: t("sidebar.vendors"),
	};
}
