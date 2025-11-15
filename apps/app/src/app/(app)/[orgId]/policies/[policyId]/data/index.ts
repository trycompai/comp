'use server';

import { CommentWithAuthor } from '@/components/comments/Comments';
import { auth } from '@/utils/auth';
import {
  AttachmentEntityType,
  AuditLog,
  AuditLogEntityType,
  CommentEntityType,
  db,
  Member,
  Organization,
  User,
} from '@db';
import { headers } from 'next/headers';

// Define the type for AuditLog with its relations
export type AuditLogWithRelations = AuditLog & {
  user: User | null;
  member: Member | null;
  organization: Organization;
};

export const getLogsForPolicy = async (policyId: string): Promise<AuditLogWithRelations[]> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  const logs = await db.auditLog.findMany({
    where: {
      organizationId,
      entityType: AuditLogEntityType.policy,
      entityId: policyId,
    },
    include: {
      user: true,
      member: true,
      organization: true,
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 3,
  });

  return logs;
};

export const getPolicyControlMappingInfo = async (policyId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return { mappedControls: [], allControls: [] };
  }

  const mappedControls = await db.control.findMany({
    where: {
      organizationId,
      policies: {
        some: {
          id: policyId,
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
};

export const getPolicy = async (policyId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return null;
  }

  const policy = await db.policy.findUnique({
    where: { id: policyId, organizationId },
    include: {
      approver: {
        include: {
          user: true,
        },
      },
      assignee: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!policy) {
    return null;
  }

  return policy;
};

export const getAssignees = async () => {
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
        notIn: ['employee', 'contractor'],
      },
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  return assignees;
};

export const getComments = async (policyId: string): Promise<CommentWithAuthor[]> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session.activeOrganizationId;

  if (!activeOrgId) {
    console.warn('Could not determine active organization ID in getComments');
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
      createdAt: 'desc',
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
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.user.id,
          name: comment.author.user.name,
          email: comment.author.user.email,
          image: comment.author.user.image,
          deactivated: comment.author.deactivated,
        },
        attachments: attachments.map((att) => ({
          id: att.id,
          name: att.name,
          type: att.type,
          downloadUrl: att.url || '', // assuming url maps to downloadUrl
          createdAt: att.createdAt.toISOString(),
        })),
        createdAt: comment.createdAt.toISOString(),
      };
    }),
  );

  return commentsWithAttachments;
};
