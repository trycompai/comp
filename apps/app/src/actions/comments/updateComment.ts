"use server";

import { db } from "@comp/db";
import { AttachmentEntityType, Comment } from "@comp/db/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";
import { BUCKET_NAME, extractS3KeyFromUrl, s3Client } from "@/app/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

const schema = z
  .object({
    commentId: z.string(),
    content: z.string().optional(), // Optional: content might not change
    attachmentIdsToAdd: z.array(z.string()).optional(),
    attachmentIdsToRemove: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.attachmentIdsToAdd?.length ||
      data.attachmentIdsToRemove?.length,
    { message: "No changes provided for update." },
  );

export const updateComment = async (input: z.infer<typeof schema>) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const { commentId, content, attachmentIdsToAdd, attachmentIdsToRemove } =
    schema.parse(input);
  const organizationId = session?.session?.activeOrganizationId;
  const userId = session?.session.userId;

  if (!organizationId) {
    return {
      success: false,
      error: "Not authorized",
      data: null,
    };
  }

  try {
    // 1. Fetch comment, include ID for return value consistency
    const comment = await db.comment.findUnique({
      where: { id: commentId, organizationId },
      select: { id: true, authorId: true, entityId: true },
    });

    if (!comment) {
      return {
        success: false,
        error: "Comment not found",
        data: null,
      };
    }

    // 2. Authorization Check (Placeholder - implement proper logic)
    const currentMember = await db.member.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    });
    if (!currentMember || comment.authorId !== currentMember.id) {
      // TODO: Add role-based check for admins
      return {
        success: false,
        error: "Not authorized",
        data: null,
      };
    }

    // --- Start Transaction ---
    const updatedCommentResult = await db.$transaction(async (tx) => {
      let updatedCommentData: Comment | null = null;
      if (content !== undefined) {
        // update returns the full comment object including id
        updatedCommentData = await tx.comment.update({
          where: { id: commentId },
          data: { content },
        });
      }

      // 4. Handle Attachments to Remove
      if (attachmentIdsToRemove && attachmentIdsToRemove.length > 0) {
        const attachments = await tx.attachment.findMany({
          where: {
            id: { in: attachmentIdsToRemove },
            organizationId,
            entityId: commentId,
          },
          select: { id: true, url: true },
        });

        // Delete from S3 (best effort)
        for (const attachmentRecord of attachments) {
          // Ensure type for internal usage
          const att: { id: string; url: string } = attachmentRecord;
          try {
            const key = extractS3KeyFromUrl(att.url);
            await s3Client.send(
              new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
              }),
            );
          } catch (s3Error: unknown) {
            console.error(
              `Failed to delete attachment ${att.id} from S3:`,
              s3Error,
            );
            // Continue even if S3 delete fails
          }
        }

        // Delete from DB
        await tx.attachment.deleteMany({
          where: {
            id: { in: attachments.map((a) => a.id) },
            organizationId,
            entityId: commentId,
          },
        });
      }

      // 5. Handle Attachments to Add
      if (attachmentIdsToAdd && attachmentIdsToAdd.length > 0) {
        // Link attachments that were temporarily uploaded linked to the TASK
        await tx.attachment.updateMany({
          where: {
            id: { in: attachmentIdsToAdd },
            organizationId,
            entityType: AttachmentEntityType.comment, // Ensure they were uploaded for a comment
            // IMPORTANT: Assuming upload linked them to the *TASK* ID temporarily
            entityId: comment.entityId, // Check they are linked to the parent task
          },
          data: {
            entityId: commentId, // Link to the actual comment ID
          },
        });
        // TODO: Check update count matches length of attachmentIdsToAdd?
      }

      // Return the newly updated comment data or the original fetched comment
      return updatedCommentData || comment;
    }); // --- End Transaction ---

    revalidatePath(`/${organizationId}/tasks/${updatedCommentResult.entityId}`);

    return {
      success: true,
      error: null,
      data: updatedCommentResult,
    };
  } catch (error) {
    // Use unknown for outer catch block
    console.error("Failed to update comment:", error);
    // Type checking before accessing message
    const errorMessage =
      error instanceof Error ? error.message : "Could not update comment.";
    return {
      success: false,
      error: errorMessage,
    };
  }
};
