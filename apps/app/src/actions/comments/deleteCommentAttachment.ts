"use server";

import { authActionClient } from "@/actions/safe-action";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@comp/db";
import { AttachmentEntityType } from "@comp/db/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { s3Client, BUCKET_NAME, extractS3KeyFromUrl } from "@/app/s3";

const schema = z.object({
  attachmentId: z.string(),
});

export const deleteCommentAttachment = authActionClient
  .schema(schema)
  .metadata({
    name: "deleteCommentAttachment",
    track: { event: "delete-comment-attachment", channel: "server" },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { session, user } = ctx;
    const { attachmentId } = parsedInput;
    const organizationId = session.activeOrganizationId;
    const userId = user.id;

    if (!organizationId) {
      return { success: false, error: "Not authorized" } as const;
    }

    try {
      // 1. Find the attachment and verify ownership/TYPE
      const attachmentToDelete = await db.attachment.findUnique({
        where: {
          id: attachmentId,
          organizationId: organizationId,
          // No include needed here
        },
      });

      if (!attachmentToDelete) {
        return {
          success: false,
          error: "Attachment not found or access denied",
        } as const;
      }

      // 1b. Verify it's a comment attachment
      if (attachmentToDelete.entityType !== AttachmentEntityType.comment) {
        console.error(
          "Attachment requested for deletion is not a comment attachment",
          attachmentId,
        );
        return {
          success: false,
          error: "Invalid attachment type for deletion",
        } as const;
      }

      // 2. Fetch the associated Comment for authorization check and revalidation path
      const comment = await db.comment.findUnique({
        where: {
          id: attachmentToDelete.entityId,
          organizationId: organizationId, // Ensure comment is in the same org
        },
        select: {
          authorId: true, // Need author to check permission
          entityId: true, // Need parent task ID for revalidation
        },
      });

      if (!comment) {
        console.error(
          "Comment associated with attachment not found during delete",
          attachmentId,
          attachmentToDelete.entityId,
        );
        // Proceed with deleting the attachment record, but log the error.
        // S3 deletion might still proceed if key extraction works.
      }

      // 3. Authorization Check: Ensure user is the comment author
      const authorMember = await db.member.findFirst({
        where: {
          userId: userId,
          organizationId: organizationId,
        },
        select: { id: true },
      });

      // Check if comment was found AND if the author matches
      if (!authorMember || !comment || comment.authorId !== authorMember.id) {
        // Add role-based check here if admins should also be able to delete
        return {
          success: false,
          error: "Not authorized to delete this attachment",
        } as const;
      }

      // 4. Attempt to delete from S3 using shared client
      let key: string;
      try {
        key = extractS3KeyFromUrl(attachmentToDelete.url);
        const deleteCommand = new DeleteObjectCommand({
          Bucket: BUCKET_NAME!,
          Key: key,
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error: any) {
        // Log error but proceed to delete DB record (orphan file is better than inconsistent state)
        console.error(
          "S3 Delete Error for comment attachment:",
          attachmentId,
          s3Error,
        );
      }

      // 5. Delete Attachment record from Database
      await db.attachment.delete({
        where: {
          id: attachmentId,
          organizationId: organizationId,
        },
      });

      // 6. Revalidate the parent task path (using comment fetched earlier)
      if (comment?.entityId) {
        // Check if comment was found before revalidating
        revalidatePath(`/${organizationId}/tasks/${comment.entityId}`);
      }

      return {
        success: true,
        data: { deletedAttachmentId: attachmentId },
      };
    } catch (error: any) {
      console.error("Error deleting comment attachment:", attachmentId, error);
      return {
        success: false,
        error: "Failed to delete attachment.",
      } as const;
    }
  });
