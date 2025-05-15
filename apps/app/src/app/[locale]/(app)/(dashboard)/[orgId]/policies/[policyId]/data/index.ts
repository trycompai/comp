"use server";

import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { cache } from "react";
import { CommentWithAuthor } from "../../../components/comments/Comments";
import { AttachmentEntityType, CommentEntityType } from "@comp/db/types";
import { db } from "@comp/db";

export const getArtifactsCreatedFromPolicy = cache(async (policyId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const organizationId = session?.session.activeOrganizationId;

	if (!organizationId) {
		return { artifacts: [], mappedControls: [], allControls: [] };
	}

	const mappedControls = await db.control.findMany({
		where: {
			organizationId,
			artifacts: {
				some: {
					policyId,
				},
			},
		},
	});

	const allControls = await db.control.findMany({
		where: {
			organizationId,
		},
	});

	return {
		mappedControls: mappedControls || [],
		allControls: allControls || [],
	};
});

export const getPolicy = cache(async (policyId: string) => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const organizationId = session?.session.activeOrganizationId;

	if (!organizationId) {
		return null;
	}

	const policy = await db.policy.findUnique({
		where: { id: policyId, organizationId },
	});

	if (!policy) {
		return null;
	}

	console.log({ policy });

	return policy;
});

export const getAssignees = cache(async () => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const organizationId = session?.session.activeOrganizationId;

	if (!organizationId) {
		return [];
	}

	const assignees = await db.member.findMany({
		where: {
			organizationId,
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

export const getComments = async (
	policyId: string,
): Promise<CommentWithAuthor[]> => {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const activeOrgId = session?.session.activeOrganizationId;

	if (!activeOrgId) {
		console.warn(
			"Could not determine active organization ID in getComments",
		);
		return [];
	}

	const comments = await db.comment.findMany({
		where: {
			organizationId: activeOrgId,
			entityId: policyId,
			entityType: CommentEntityType.policy,
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

	const commentsWithAttachments = await Promise.all(
		comments.map(async (comment) => {
			const attachments = await db.attachment.findMany({
				where: {
					organizationId: activeOrgId,
					entityId: comment.id,
					entityType: AttachmentEntityType.comment,
				},
			});
			return {
				...comment,
				attachments,
			};
		}),
	);

	return commentsWithAttachments;
};
