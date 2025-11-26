'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { z } from 'zod';
import 'server-only';

const submitSOAForApprovalSchema = z.object({
  documentId: z.string(),
  approverId: z.string(),
});

export const submitSOAForApproval = authActionClient
  .inputSchema(submitSOAForApprovalSchema)
  .metadata({
    name: 'submit-soa-for-approval',
    track: {
      event: 'submit-soa-for-approval',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId, approverId } = parsedInput;
    const { session, user } = ctx;

    if (!session?.activeOrganizationId || !user?.id) {
      throw new Error('Unauthorized');
    }

    const organizationId = session.activeOrganizationId;

    // Verify approver is a member of the organization
    const approverMember = await db.member.findFirst({
      where: {
        id: approverId,
        organizationId,
        deactivated: false,
      },
    });

    if (!approverMember) {
      throw new Error('Approver not found in organization');
    }

    // Check if approver is owner or admin
    const isOwnerOrAdmin = approverMember.role.includes('owner') || approverMember.role.includes('admin');
    if (!isOwnerOrAdmin) {
      throw new Error('Approver must be an owner or admin');
    }

    // Get the document
    const document = await db.sOADocument.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!document) {
      throw new Error('SOA document not found');
    }

    if ((document as any).status === 'needs_review') {
      throw new Error('Document is already pending approval');
    }

    // Submit for approval - set approverId and status to needs_review
    const updatedDocument = await db.sOADocument.update({
      where: { id: documentId },
      data: {
        approverId,
        status: 'needs_review',
      },
    });

    return {
      success: true,
      data: updatedDocument,
    };
  });

