"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";

export const addEmployeeWithoutInvite = async ({
	email,
	organizationId,
	rut,
}: {
	email: string;
	organizationId: string;
	rut?: string;
}) => {
	try {
		let userId = "";
		const existingUser = await db.user.findUnique({
			where: {
				email,
			},
		});

		if (!existingUser) {
			const newUser = await db.user.create({
				data: {
					emailVerified: false,
					email,
					name: email.split("@")[0],
					rut: rut || null,
				},
			});

			userId = newUser.id;
		}

		const member = await auth.api.addMember({
			body: {
				userId: existingUser?.id ?? userId,
				organizationId,
				role: "employee",
			},
		});

		return { success: true, data: member };
	} catch (error) {
		console.error("Error adding employee:", error);
		return { success: false, error: "Failed to add employee" };
	}
};
