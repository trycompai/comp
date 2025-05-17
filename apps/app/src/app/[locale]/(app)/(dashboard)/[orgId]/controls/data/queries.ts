import "server-only";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { cache } from "react";
import type { GetControlSchema } from "./validations";

const controlInclude = {
	artifacts: {
		include: {
			policy: {
				select: {
					status: true,
				},
			},
		},
	},
	requirementsMapped: {
		include: {
			frameworkInstance: {
				include: {
					framework: true,
				},
			},
		},
	},
} satisfies Prisma.ControlInclude;

export type ControlWithRelations = Prisma.ControlGetPayload<{
	include: typeof controlInclude;
}>;

export async function getControls(
	input: GetControlSchema,
): Promise<{ data: ControlWithRelations[]; pageCount: number }> {
	return await cache(async () => {
		try {
			const session = await auth.api.getSession({
				headers: await headers(),
			});
			const organizationId = session?.session.activeOrganizationId;

			if (!organizationId) {
				throw new Error("Organization not found");
			}

			const orderBy = input.sort.map((sort) => ({
				[sort.id]: sort.desc ? "desc" : "asc",
			}));

			const where: Prisma.ControlWhereInput = {
				organizationId,
				...(input.name && {
					name: {
						contains: input.name,
						mode: Prisma.QueryMode.insensitive,
					},
				}),
				...(input.lastUpdated.length > 0 && {
					lastUpdated: {
						in: input.lastUpdated,
					},
				}),
			};

			const controls = await db.control.findMany({
				where,
				orderBy: orderBy.length > 0 ? orderBy : [{ name: "asc" }],
				skip: (input.page - 1) * input.perPage,
				take: input.perPage,
				include: controlInclude,
			});

			const total = await db.control.count({
				where,
			});

			const pageCount = Math.ceil(total / input.perPage);
			return { data: controls, pageCount };
		} catch (_err) {
			return { data: [], pageCount: 0 };
		}
	})();
}
