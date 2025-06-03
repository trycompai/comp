"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import type { Member, Organization, User } from "@comp/db/types";
import { Role } from "@comp/db/types";
import type { ActionResponse } from "@/types/actions";

// Define the detailed Organization type expected by the frontend
interface OrganizationWithMembersAndUsers extends Organization {
	members: (Member & { user: User })[];
}

// Define the Member type expected by the frontend
interface MemberWithUser extends Member {
	user: User;
}

// --- Fetch All Organizations --- Replaces fetchOrganizationsAction
export async function fetchOrganizations(): Promise<
	ActionResponse<OrganizationWithMembersAndUsers[]>
> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.email?.endsWith("@trycomp.ai") && !session?.user?.email?.endsWith("@aubo.ai")) {
		return { success: false, error: "Unauthorized: Admin access required" };
	}

	try {
		const organizations = await db.organization.findMany({
			include: {
				members: {
					include: {
						user: true,
					},
				},
			},
			orderBy: {
				name: "asc",
			},
		});
		return { success: true, data: organizations };
	} catch (error) {
		console.error("Error fetching organizations:", error);
		return { success: false, error: "Failed to fetch organizations" };
	}
}

// --- Fetch Admin Users (@trycomp.ai, @securis360.com & @aubo.ai) ---
export async function fetchAdminUsers(): Promise<ActionResponse<User[]>> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.email?.endsWith("@trycomp.ai") && !session?.user?.email?.endsWith("@aubo.ai")) {
		return { success: false, error: "Unauthorized: Admin access required" };
	}

	try {
		const adminUsers = await db.user.findMany({
			where: {
				OR: [
					{
						email: {
							endsWith: "@trycomp.ai",
						},
					},
					{
						email: {
							endsWith: "@securis360.com",
						},
					},
					{
						email: {
							endsWith: "@aubo.ai",
						},
					},
				],
			},
			orderBy: {
				email: "asc",
			},
		});
		return { success: true, data: adminUsers };
	} catch (error) {
		console.error("Error fetching admin users:", error);
		return { success: false, error: "Failed to fetch admin users" };
	}
}

// --- Add Member to Organization --- Renamed from addSelfToOrg
const addMemberSchema = z.object({
	organizationId: z.string(),
	targetUserId: z.string(), // ID of the user to add
});

export async function addMemberToOrg(
	input: z.infer<typeof addMemberSchema>,
): Promise<ActionResponse<MemberWithUser>> {
	// Authorization check: Ensure the CALLER is an admin
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.email?.endsWith("@trycomp.ai") && !session?.user?.email?.endsWith("@aubo.ai")) {
		return {
			success: false,
			error: "Unauthorized: Caller is not an admin",
		};
	}

	// Validate input
	const parseResult = addMemberSchema.safeParse(input);
	if (!parseResult.success) {
		return { success: false, error: "Invalid input" };
	}
	const { organizationId, targetUserId } = parseResult.data;

	try {
		// Check if member already exists
		const existingMember = await db.member.findFirst({
			where: {
				organizationId: organizationId,
				userId: targetUserId, // Check for the target user
			},
			include: { user: true },
		});

		if (existingMember) {
			return { success: true, data: existingMember }; // Already a member
		}

		// Use Kinde server-side API to add the TARGET member
		// Note: Ensure Kinde API allows adding arbitrary users by an authorized admin
		// This might require specific Kinde setup or permissions.
		await auth.api.addMember({
			body: {
				userId: targetUserId, // Use the target user ID
				organizationId: organizationId,
				role: Role.admin, // Defaulting to admin for now
			},
		});

		// Refetch the newly created member with user details
		const createdMember = await db.member.findFirst({
			where: {
				organizationId: organizationId,
				userId: targetUserId,
			},
			include: { user: true },
		});

		if (!createdMember) {
			console.error(
				"Failed to retrieve member immediately after adding via Kinde API.",
			);
			return {
				success: false,
				error: "Failed to confirm membership creation.",
			};
		}

		return { success: true, data: createdMember };
	} catch (error) {
		console.error("Error adding member to organization:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to add member";
		return { success: false, error: errorMessage };
	}
}

// --- Remove Member from Organization ---
const removeMemberSchema = z.object({
	organizationId: z.string(),
	targetUserId: z.string(), // ID of the user to remove
});

export async function removeMember(
	input: z.infer<typeof removeMemberSchema>,
): Promise<ActionResponse<{ removed: boolean }>> {
	// Authorization check: Ensure the CALLER is an admin
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.email?.endsWith("@trycomp.ai") && !session?.user?.email?.endsWith("@aubo.ai")) {
		return {
			success: false,
			error: "Unauthorized: Caller is not an admin",
		};
	}

	// Validate input
	const parseResult = removeMemberSchema.safeParse(input);
	if (!parseResult.success) {
		return { success: false, error: "Invalid input" };
	}
	const { organizationId, targetUserId } = parseResult.data;

	// Prevent admin from removing themselves via this action (they should use leaveOrganization)
	if (session.user?.id === targetUserId) {
		return {
			success: false,
			error: "Admin cannot remove self using this action. Use 'Leave Organization'.",
		};
	}

	try {
		// Check if the target user is actually a member
		const targetMember = await db.member.findFirst({
			where: {
				organizationId: organizationId,
				userId: targetUserId,
			},
		});

		if (!targetMember) {
			return {
				success: false,
				error: "Target user is not a member of this organization.",
			};
		}

		// Prevent removing the organization owner
		if (targetMember.role === Role.owner) {
			return {
				success: false,
				error: "Cannot remove the organization owner.",
			};
		}

		// Use Kinde server-side API to remove the TARGET member
		// Check Kinde documentation for the correct server-side method.
		// Assuming a hypothetical `auth.api.removeMember` exists.
		// If not, direct DB deletion is needed, but ensure cascading deletes or other relations are handled.

		// Placeholder for Kinde remove member API call or DB operation
		// await auth.api.removeMember({ organizationId, userId: targetUserId });
		// OR direct DB deletion:
		await db.member.deleteMany({
			where: {
				organizationId: organizationId,
				userId: targetUserId,
			},
		});
		// Consider if associated sessions for the removed user should be invalidated:
		// await db.session.deleteMany({ where: { userId: targetUserId, organizationId: organizationId } });

		return { success: true, data: { removed: true } };
	} catch (error) {
		console.error("Error removing member from organization:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Failed to remove member";
		return { success: false, error: errorMessage };
	}
}

// --- Fetch Organization Members --- Replaces fetchOrgMembersAction
const fetchMembersSchema = z.object({
	organizationId: z.string(),
});

export async function fetchOrgMembers(
	input: z.infer<typeof fetchMembersSchema>,
): Promise<ActionResponse<MemberWithUser[]>> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.email?.endsWith("@trycomp.ai") && !session?.user?.email?.endsWith("@aubo.ai")) {
		return { success: false, error: "Unauthorized: Admin access required" };
	}

	// Validate input
	const parseResult = fetchMembersSchema.safeParse(input);
	if (!parseResult.success) {
		return { success: false, error: "Invalid input" };
	}
	const { organizationId } = parseResult.data;

	try {
		const members = await db.member.findMany({
			where: {
				organizationId: organizationId,
			},
			include: {
				user: true,
			},
			orderBy: {
				user: {
					name: "asc",
				},
			},
		});
		return { success: true, data: members };
	} catch (error) {
		console.error("Error fetching organization members:", error);
		return { success: false, error: "Failed to fetch members" };
	}
}
