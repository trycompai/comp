"use server";

import { randomBytes } from "crypto";
import { authActionClient } from "@/actions/safe-action";
import { APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET, s3Client } from "@/app/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { z } from "zod";

import { AttachmentType } from "@trycompai/db";

const uploadSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileData: z.string(), // base64 encoded
  organizationId: z.string(),
});

function mapFileTypeToAttachmentType(fileType: string): AttachmentType {
  const type = fileType.split("/")[0];
  switch (type) {
    case "image":
      return AttachmentType.image;
    case "video":
      return AttachmentType.video;
    case "audio":
      return AttachmentType.audio;
    case "application":
      return AttachmentType.document;
    default:
      return AttachmentType.other;
  }
}

export const uploadQuestionnaireFile = authActionClient
  .inputSchema(uploadSchema)
  .metadata({
    name: "upload-questionnaire-file",
    track: {
      event: "upload-questionnaire-file",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { fileName, fileType, fileData, organizationId } = parsedInput;
    const { session } = ctx;

    if (
      !session?.activeOrganizationId ||
      session.activeOrganizationId !== organizationId
    ) {
      throw new Error("Unauthorized");
    }

    if (!s3Client) {
      throw new Error("S3 client not configured");
    }

    if (!APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET) {
      throw new Error(
        "Questionnaire upload bucket is not configured. Please set APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET environment variable.",
      );
    }

    try {
      // Convert base64 to buffer
      const fileBuffer = Buffer.from(fileData, "base64");

      // Validate file size (10MB limit)
      const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
      if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(
          `File exceeds the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit`,
        );
      }

      // Generate unique file key
      const fileId = randomBytes(16).toString("hex");
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const timestamp = Date.now();
      const s3Key = `${organizationId}/questionnaire-uploads/${timestamp}-${fileId}-${sanitizedFileName}`;

      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: fileType,
        Metadata: {
          originalFileName: fileName,
          organizationId,
        },
      });

      await s3Client.send(putCommand);

      // Return S3 key directly instead of creating attachment record
      // Questionnaire files are temporary processing files, not permanent attachments
      return {
        success: true,
        data: {
          s3Key,
          fileName,
          fileType,
        },
      };
    } catch (error) {
      // Provide more helpful error messages for common S3 errors
      if (error && typeof error === "object" && "Code" in error) {
        const awsError = error as { Code: string; message?: string };

        if (awsError.Code === "AccessDenied") {
          throw new Error(
            `Access denied to S3 bucket "${APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET}". ` +
              `Please verify that:\n` +
              `1. The bucket "${APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET}" exists\n` +
              `2. Your AWS credentials have s3:PutObject permission for this bucket\n` +
              `3. The bucket is in the correct region (${process.env.APP_AWS_REGION || "not set"})\n` +
              `4. The bucket name is correct`,
          );
        }

        if (awsError.Code === "NoSuchBucket") {
          throw new Error(
            `S3 bucket "${APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET}" does not exist. ` +
              `Please create the bucket or update APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET environment variable.`,
          );
        }

        if (
          awsError.Code === "InvalidAccessKeyId" ||
          awsError.Code === "SignatureDoesNotMatch"
        ) {
          throw new Error(
            `Invalid AWS credentials. Please check APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY environment variables.`,
          );
        }
      }

      throw error instanceof Error
        ? error
        : new Error("Failed to upload questionnaire file");
    }
  });
