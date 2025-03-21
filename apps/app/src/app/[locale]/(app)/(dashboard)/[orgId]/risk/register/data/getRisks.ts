"use server";

import { auth } from "@/auth";
import { db } from "@bubba/db";
import { type Departments, Prisma, type RiskStatus } from "@bubba/db/types";

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
	const session = await auth();

	if (!session || !session.user.organizationId) {
		return {
			success: false,
			error: "Unauthorized",
		};
	}

	const where = {
		organizationId: session.user.organizationId,
		...(search && {
			title: {
				contains: search,
				mode: Prisma.QueryMode.insensitive,
			},
		}),
		...(status ? { status } : {}),
		...(department ? { department } : {}),
		...(assigneeId ? { ownerId: assigneeId } : {}),
	};

	const skip = ((page ?? 1) - 1) * (pageSize ?? 10);

	const risks = await db.risk.findMany({
		where,
		skip,
		take: pageSize,
		include: {
			owner: true,
		},
	});

	return {
		risks,
	};
}
