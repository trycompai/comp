"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { type Departments, Prisma, type RiskStatus } from "@comp/db/types";
import { headers } from "next/headers";

export async function getRisks({
	search,
	page,
	pageSize,
	status,
	department,
	assigneeId,
}: {
	search?: string;
	page?: number;
	pageSize?: number;
	status?: RiskStatus | null;
	department?: Departments | null;
	assigneeId?: string | null;
}) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || !session.session.activeOrganizationId) {
		return {
			success: false,
			error: "Unauthorized",
		};
	}

	const where = {
		organizationId: session.session.activeOrganizationId,
		...(search && {
			title: {
				contains: search,
				mode: Prisma.QueryMode.insensitive,
			},
		}),
		...(status ? { status } : {}),
		...(department ? { department } : {}),
		...(assigneeId ? { assigneeId } : {}),
	};

	const skip = ((page ?? 1) - 1) * (pageSize ?? 10);

	const risks = await db.risk.findMany({
		where,
		skip,
		take: pageSize,
		include: {
			assignee: {
				include: {
					user: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	// Transform the data to match the expected structure by RiskRegisterTable
	const transformedRisks = risks.map((risk) => ({
		...risk,
		assignee: risk.assignee ? risk.assignee.user : null,
	}));

	return {
		risks: transformedRisks,
	};
}
