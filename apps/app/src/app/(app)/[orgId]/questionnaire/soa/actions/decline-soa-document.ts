'use server';

import { authActionClient } from '@/actions/safe-action';
import { db } from '@db';
import { z } from 'zod';
import 'server-only';

const declineSOADocumentSchema = z.object({
  documentId: z.string(),
});

export const declineSOADocument = authActionClient
  .inputSchema(declineSOADocumentSchema)
  .metadata({
    name: 'decline-soa-document',
    track: {
      event: 'decline-soa-document',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { documentId } = parsedInput;
    const { session, user } = ctx;

    if (!session?.activeOrganizationId || !user?.id) {
      throw new Error('Unauthorized');
    }

    const organizationId = session.activeOrganizationId;
    const userId = user.id;

    // Check if user is owner or admin
    const member = await db.member.findFirst({
      where: {
        organizationId,
        userId,
        deactivated: false,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    // Check if user has owner or admin role
    const isOwnerOrAdmin = member.role.includes('owner') || member.role.includes('admin');

    if (!isOwnerOrAdmin) {
      throw new Error('Only owners and admins can decline SOA documents');
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

    // Check if document is pending approval and current member is the approver
    if (!(document as any).approverId || (document as any).approverId !== member.id) {
      throw new Error('Document is not pending your approval');
    }

    if ((document as any).status !== 'needs_review') {
      throw new Error('Document is not in needs_review status');
    }

    // Decline the document - clear approverId and set status back to completed (or in_progress)
    const updatedDocument = await db.sOADocument.update({
      where: { id: documentId },
      data: {
        approverId: null, // Clear approver
        approvedAt: null, // Clear approved date
        status: 'completed', // Set back to completed so it can be edited and resubmitted
      },
    });

    return {
      success: true,
      data: updatedDocument,
    };
  });

