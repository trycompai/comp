"use server";

import { db } from "@comp/db";
import { authActionClient } from "@/actions/safe-action";
import { employeesInputSchema } from "../types";
import { appErrors } from "../types";

export const getEmployees = authActionClient
	.schema(employeesInputSchema)
	.metadata({
		name: "get-employees",
		track: {
			event: "get-employees",
			channel: "server",
		},
	})
	.action(async ({ parsedInput, ctx }) => {
		const { search, role, page = 1, per_page = 10 } = parsedInput;
		const { session } = ctx;

		if (!session.activeOrganizationId) {
			return {
				success: false,
				error: appErrors.UNAUTHORIZED.message,
			};
		}

		try {
			const skip = (page - 1) * per_page;

			const [employees, total] = await Promise.all([
				db.member.findMany({
					where: {
						organizationId: session.activeOrganizationId,
						role: {
							in: ["employee"],
						},
						AND: [
							search
								? {
										OR: [
											{
												user: {
													name: { contains: search, mode: "insensitive" },
												},
											},
											{
												user: {
													email: { contains: search, mode: "insensitive" },
												},
											},
										],
									}
								: {},
						],
					},
					include: {
						user: true,
					},
					skip,
					take: per_page,
				}),
				db.member.count({
					where: {
						organizationId: session.activeOrganizationId,
						role: "employee",
						AND: [
							search
								? {
										OR: [
											{
												user: {
													name: { contains: search, mode: "insensitive" },
												},
											},
											{
												user: {
													email: { contains: search, mode: "insensitive" },
												},
											},
										],
									}
								: {},
						],
					},
				}),
			]);

			return {
				success: true,
				data: { employees, total },
			};
		} catch (error) {
			console.error("Error fetching employees:", error);
			return {
				success: false,
				error: appErrors.UNEXPECTED_ERROR.message,
			};
		}
	});
