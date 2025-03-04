"use server";

import { authActionClient } from "@/actions/safe-action";
import { db } from "@bubba/db";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are not set");
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const getUploadUrl = authActionClient
  .schema(
    z.object({
      evidenceId: z.string(),
      fileName: z.string(),
      fileType: z.string(),
    }),
  )
  .metadata({
    name: "getUploadUrl",
    track: {
      event: "get-upload-url",
      channel: "server",
    },
  })
  .action(async ({ ctx, parsedInput }) => {
    const { user } = ctx;
    const { evidenceId, fileName, fileType } = parsedInput;

    if (!user.organizationId) {
      return {
        success: false,
        error: "Not authorized - no organization found",
      } as const;
    }

    try {
      // Check if evidence exists and belongs to organization
      const evidence = await db.organizationEvidence.findFirst({
        where: {
          id: evidenceId,
          organizationId: user.organizationId,
        },
      });

      if (!evidence) {
        return {
          success: false,
          error: "Evidence not found",
        } as const;
      }

      // Generate a unique file key
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `${user.organizationId}/${evidenceId}/${timestamp}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 3600, // URL expires in 1 hour
      });

      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      // Pre-register the file URL in the database
      await db.organizationEvidence.update({
        where: { id: evidenceId },
        data: {
          fileUrls: {
            push: fileUrl,
          },
        },
      });

      return {
        success: true,
        data: {
          uploadUrl,
          fileUrl,
        },
      } as const;
    } catch (error) {
      console.error("Error generating upload URL:", error);
      return {
        success: false,
        error: "Failed to generate upload URL",
      } as const;
    }
  });
