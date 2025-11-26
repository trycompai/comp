'use server';

import { authActionClient } from '@/actions/safe-action';
import { parseQuestionnaireTask } from '@/jobs/tasks/vendors/parse-questionnaire';
import { tasks } from '@trigger.dev/sdk';
import { z } from 'zod';
import { APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET } from '@/app/s3';

const inputSchema = z.object({
  inputType: z.enum(['file', 'url', 'attachment', 's3']),
  // For file uploads
  fileData: z.string().optional(), // base64 encoded
  fileName: z.string().optional(),
  fileType: z.string().optional(), // MIME type
  // For URLs
  url: z.string().url().optional(),
  // For attachments
  attachmentId: z.string().optional(),
  // For S3 keys (temporary questionnaire files)
  s3Key: z.string().optional(),
});

export const parseQuestionnaireAI = authActionClient
  .inputSchema(inputSchema)
  .metadata({
    name: 'parse-questionnaire-ai',
    track: {
      event: 'parse-questionnaire-ai',
      channel: 'server',
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { inputType } = parsedInput;
    const { session } = ctx;
    
    if (!session?.activeOrganizationId) {
      throw new Error('No active organization');
    }

    // Validate questionnaire upload bucket is configured
    if (!APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET) {
      throw new Error('Questionnaire upload service is not configured. Please set APP_AWS_QUESTIONNAIRE_UPLOAD_BUCKET environment variable to use this feature.');
    }
    
    const organizationId = session.activeOrganizationId;
    
    try {
      // Trigger the parse questionnaire task in Trigger.dev
      // Only include fileData if inputType is 'file' (for backward compatibility)
      // Otherwise use attachmentId or url
      const payload: {
        inputType: 'file' | 'url' | 'attachment' | 's3';
        organizationId: string;
        fileData?: string;
        fileName?: string;
        fileType?: string;
        url?: string;
        attachmentId?: string;
        s3Key?: string;
      } = {
        inputType,
        organizationId,
      };

      if (inputType === 'file' && parsedInput.fileData) {
        payload.fileData = parsedInput.fileData;
        payload.fileName = parsedInput.fileName;
        payload.fileType = parsedInput.fileType;
      } else if (inputType === 'url' && parsedInput.url) {
        payload.url = parsedInput.url;
      } else if (inputType === 'attachment' && parsedInput.attachmentId) {
        payload.attachmentId = parsedInput.attachmentId;
      } else if (inputType === 's3' && parsedInput.s3Key) {
        payload.s3Key = parsedInput.s3Key;
        payload.fileName = parsedInput.fileName;
        payload.fileType = parsedInput.fileType;
      }

      const handle = await tasks.trigger<typeof parseQuestionnaireTask>(
        'parse-questionnaire',
        payload,
      );

      return {
        success: true,
        data: {
          taskId: handle.id, // Return task ID for polling
        },
      };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to trigger parse questionnaire task');
    }
  });

