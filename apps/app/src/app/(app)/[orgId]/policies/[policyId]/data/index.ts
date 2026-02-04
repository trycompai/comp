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
  type Prisma,
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
  const userId = session?.user?.id;

  console.log('[getPolicy] organizationId:', organizationId);
  console.log('[getPolicy] userId:', userId);

  if (!organizationId) {
    console.log('[getPolicy] no organizationId');
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
      currentVersion: {
        include: {
          publishedBy: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  });

  console.log('[getPolicy] policy:', policy);

  if (!policy) {
    console.log('[getPolicy] no policy');
    return null;
  }

  // Lazy migration: If policy has no current version or the reference is orphaned
  if (!policy.currentVersionId || !policy.currentVersion) {
    try {
      // First, check if any versions already exist for this policy
      const latestVersion = await db.policyVersion.findFirst({
        where: { policyId: policy.id },
        orderBy: { version: 'desc' },
        select: { id: true, version: true },
      });

      // If versions already exist, just set the latest one as current (fix orphaned state)
      if (latestVersion) {
        const updatedPolicy = await db.policy.update({
          where: { id: policy.id },
          data: { currentVersionId: latestVersion.id },
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
            currentVersion: {
              include: {
                publishedBy: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });
        return updatedPolicy;
      }

      // No versions exist - create version 1 from policy data
      // Get member ID for associating with the version
      let memberId: string | null = null;
      if (userId) {
        const member = await db.member.findFirst({
          where: {
            userId,
            organizationId,
            deactivated: false,
          },
          select: { id: true },
        });
        memberId = member?.id ?? null;
      }

      // Create version 1 in a transaction
      const updatedPolicy = await db.$transaction(async (tx) => {
        // Create version 1 with all existing policy data
        const newVersion = await tx.policyVersion.create({
          data: {
            policyId: policy.id,
            version: 1,
            content: (policy.content as Prisma.InputJsonValue[]) || [],
            pdfUrl: policy.pdfUrl, // Copy over any existing PDF
            publishedById: memberId,
            changelog: 'Migrated from legacy policy',
          },
        });

        // Update policy to set currentVersionId
        const updated = await tx.policy.update({
          where: { id: policy.id },
          data: {
            currentVersionId: newVersion.id,
          },
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
            currentVersion: {
              include: {
                publishedBy: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });

        return updated;
      });

      return updatedPolicy;
    } catch (error) {
      // If migration fails, still return the policy without version
      // This ensures the user can still access their policy
      console.error('Lazy migration failed for policy:', policyId, error);
      return policy;
    }
  }

  return policy;
};

export const getPolicyVersions = async (policyId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  // Verify policy belongs to organization
  const policy = await db.policy.findUnique({
    where: { id: policyId, organizationId },
    select: { id: true },
  });

  if (!policy) {
    return [];
  }

  const versions = await db.policyVersion.findMany({
    where: { policyId },
    orderBy: { version: 'desc' },
    include: {
      publishedBy: {
        include: {
          user: true,
        },
      },
    },
  });

  return versions;
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
