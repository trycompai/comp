import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { tool } from 'ai';
import z from 'zod/v3';
import type { DataPart } from '../messages/data-parts';

interface Params {
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>;
}

const DEFAULTS = {
  bucket: 'comp-testing-lambda-tasks',
  region: 'us-east-1',
  orgId: 'org_689ce3dced87cc45f600a04b',
  taskId: 'tsk_689ce3dd6f19f4cf1f0ea061',
};

const inputSchema = z.object({
  content: z.string().min(1).describe('The full file content to store'),
  bucket: z.string().optional().describe('Target S3 bucket'),
  region: z.string().optional().describe('AWS region for the S3 bucket'),
  orgId: z.string().optional().describe('Organization identifier'),
  taskId: z.string().optional().describe('Task identifier'),
  contentType: z.string().optional().describe('MIME type, defaults to text/plain for generic code'),
});
interface ToolInput {
  content: string;
  bucket?: string;
  region?: string;
  orgId?: string;
  taskId?: string;
  contentType?: string;
}

export const storeToS3 = ({ writer }: Params) => {
  const config = {
    description:
      'Upload a generated code artifact to S3 for persistence. Use after user confirms the code is good.',
    inputSchema,
    execute: async (args: unknown, ctx: { toolCallId: string }) => {
      const { toolCallId } = ctx;
      const parsed: unknown = inputSchema.parse(args);
      const input = parsed as ToolInput;
      const { content, bucket, region, orgId, taskId, contentType } = input;

      // Validate task format: must export a function via module.exports
      // Validate task format: must export a function with only event parameter
      // (getSecret and fetch are provided as globals in the Lambda sandbox)
      const isTaskFn =
        /module\.exports\s*=\s*async\s*\(\s*event\s*\)\s*=>\s*\{/.test(content) ||
        /module\.exports\s*=\s*\(\s*event\s*\)\s*=>\s*\{/.test(content) ||
        /module\.exports\s*=\s*async\s*function\s*\(\s*event\s*\)\s*\{/.test(content) ||
        /module\.exports\s*=\s*function\s*\(\s*event\s*\)\s*\{/.test(content);

      if (!isTaskFn) {
        const message =
          'Task module must export a function via module.exports = async (event) => { ... }';
        writer.write({
          id: toolCallId,
          type: 'data-store-to-s3',
          data: {
            status: 'error',
            error: { message },
          },
        });
        return message;
      }
      // Enforce: no usage of process.env in task code
      if (/process\.env\b/.test(content)) {
        const message =
          'Do not use process.env in task code; use the global getSecret function provided by the Lambda sandbox.';
        writer.write({
          id: toolCallId,
          type: 'data-store-to-s3',
          data: {
            status: 'error',
            error: { message },
          },
        });
        return message;
      }
      const resolvedBucket = bucket || DEFAULTS.bucket;
      const resolvedRegion = region || DEFAULTS.region;
      const resolvedOrgId = orgId || DEFAULTS.orgId;
      const resolvedTaskId = taskId || DEFAULTS.taskId;
      const keyBase = `${resolvedOrgId}/${resolvedTaskId}`;
      const key = `${keyBase}.js`;

      writer.write({
        id: toolCallId,
        type: 'data-store-to-s3',
        data: {
          status: 'uploading',
          bucket: resolvedBucket,
          key,
          region: resolvedRegion,
        },
      });

      try {
        const credentials =
          process.env.APP_AWS_ACCESS_KEY_ID && process.env.APP_AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY as string,
              }
            : undefined;
        const s3 = new S3Client({ region: resolvedRegion, credentials });
        await s3.send(
          new PutObjectCommand({
            Bucket: resolvedBucket,
            Key: key,
            Body: Buffer.from(content, 'utf8'),
            ContentType: contentType || 'application/javascript; charset=utf-8',
            Metadata: {
              runtime: 'nodejs20.x',
              handler: 'task-fn',
              language: 'javascript',
              entry: 'task.js',
              packaging: 'task-fn',
              filename: key,
            },
          }),
        );

        writer.write({
          id: toolCallId,
          type: 'data-store-to-s3',
          data: {
            status: 'done',
            bucket: resolvedBucket,
            key,
            region: resolvedRegion,
          },
        });

        return `Stored code in s3://${resolvedBucket}/${key}`;
      } catch (error) {
        const message = (error as Error)?.message || 'Unknown error uploading to S3';
        writer.write({
          id: toolCallId,
          type: 'data-store-to-s3',
          data: {
            status: 'error',
            bucket: resolvedBucket,
            key,
            region: resolvedRegion,
            error: { message },
          },
        });
        return message;
      }
    },
  } as const;
  return tool(config as any);
};
