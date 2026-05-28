import { metadata, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';
import { db } from '@db';
import { format } from 'date-fns';
import {
  getAutomationHeaders,
  streamAutomationRuns,
  findTasksWithEvidence,
} from '@/tasks/evidence-export/evidence-data-loader';
import {
  generateAutomationPDFFromStream,
  generateTaskSummaryPDF,
  sanitizeFilename,
} from '@/tasks/evidence-export/evidence-pdf-generator';
import { buildAutomationJsonStream } from '@/tasks/evidence-export/evidence-json-builder';
import {
  getTaskAttachments,
  appendAttachmentToArchive,
  createFilenameTracker,
} from '@/tasks/evidence-export/evidence-attachment-streamer';
import { configure as configureStringify } from 'safe-stable-stringify';

const safeStringify = configureStringify({
  bigint: true,
  circularValue: '[Circular]',
  deterministic: false,
});

const PRESIGNED_URL_EXPIRY = 3600;

function createS3Client(): S3Client {
  const region = process.env.APP_AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.APP_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.APP_AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS S3 credentials missing. Set APP_AWS_ACCESS_KEY_ID and APP_AWS_SECRET_ACCESS_KEY.',
    );
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(process.env.APP_AWS_ENDPOINT
      ? {
          endpoint: process.env.APP_AWS_ENDPOINT,
          forcePathStyle: true,
        }
      : {}),
  });
}

function getBucketName(): string {
  const bucket = process.env.APP_AWS_BUCKET_NAME;
  if (!bucket) throw new Error('APP_AWS_BUCKET_NAME is not set.');
  return bucket;
}

export const exportOrganizationEvidenceTask = schemaTask({
  id: 'export-organization-evidence',
  maxDuration: 60 * 30,
  retry: { maxAttempts: 0 },
  schema: z.object({
    organizationId: z.string(),
    includeJson: z.boolean().default(false),
  }),
  run: async ({ organizationId, includeJson }) => {
    metadata.set('status', 'starting');
    metadata.set('progress', 0);

    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!organization) throw new Error('Organization not found');

    const taskIds = await findTasksWithEvidence(organizationId);
    if (taskIds.length === 0) throw new Error('No tasks with evidence found');

    metadata.set('tasksTotal', taskIds.length);
    metadata.set('tasksCompleted', 0);
    metadata.set('status', 'generating');

    const orgFolder = sanitizeFilename(organization.name);
    const exportDate = format(new Date(), 'yyyy-MM-dd');
    const runId = metadata.get('runId') ?? crypto.randomUUID().slice(0, 8);
    const s3Key = `${organizationId}/exports/evidence-${exportDate}-${runId}.zip`;

    const s3Client = createS3Client();
    const bucket = getBucketName();

    const archive = archiver('zip', { zlib: { level: 6 } });
    const zipBuffer = await buildZipBuffer({
      archive,
      organizationId,
      organizationName: organization.name,
      orgFolder,
      taskIds,
      includeJson,
    });

    metadata.set('status', 'uploading');

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: zipBuffer,
        ContentType: 'application/zip',
      }),
    );

    metadata.set('status', 'generating-link');
    metadata.set('progress', 95);

    const downloadUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
      { expiresIn: PRESIGNED_URL_EXPIRY },
    );

    metadata.set('status', 'completed');
    metadata.set('progress', 100);
    metadata.set('downloadUrl', downloadUrl);

    return { downloadUrl, s3Key };
  },
});

async function buildZipBuffer(params: {
  archive: archiver.Archiver;
  organizationId: string;
  organizationName: string;
  orgFolder: string;
  taskIds: string[];
  includeJson: boolean;
}): Promise<Buffer> {
  const chunks: Buffer[] = [];
  params.archive.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    params.archive.on('end', resolve);
    params.archive.on('error', reject);
  });
  await populateArchive(params);
  await finished;
  return Buffer.concat(chunks);
}

async function populateArchive({
  archive,
  organizationId,
  organizationName,
  orgFolder,
  taskIds,
  includeJson,
}: {
  archive: archiver.Archiver;
  organizationId: string;
  organizationName: string;
  orgFolder: string;
  taskIds: string[];
  includeJson: boolean;
}): Promise<void> {
  const manifestEntries: Array<{
    id: string;
    title: string;
    automations: number;
    attachments: number;
  }> = [];
  let totalAttachments = 0;

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    try {
      const [headers, attachments] = await Promise.all([
        getAutomationHeaders({ organizationId, taskId }),
        getTaskAttachments(organizationId, taskId),
      ]);

      if (headers.automations.length === 0 && attachments.length === 0) {
        continue;
      }

      const taskIdSuffix = headers.taskId.slice(-8);
      const taskFolder = `${orgFolder}/${sanitizeFilename(headers.taskTitle)}-${taskIdSuffix}`;

      const summaryPdf = generateTaskSummaryPDF(headers, {
        attachmentsCount: attachments.length,
      });
      archive.append(summaryPdf, { name: `${taskFolder}/00-summary.pdf` });

      if (attachments.length > 0) {
        const uniqueName = createFilenameTracker();
        for (const attachment of attachments) {
          await appendAttachmentToArchive({
            archive,
            attachment,
            folderPath: `${taskFolder}/01-attachments`,
            uniqueName,
          });
        }
      }

      for (const automationHeader of headers.automations) {
        const typePrefix =
          automationHeader.type === 'app_automation' ? 'app' : 'custom';
        const automationName = sanitizeFilename(automationHeader.name);
        const idSuffix = automationHeader.id.slice(-8);
        const filePrefix = `${taskFolder}/${typePrefix}-${automationName}-${idSuffix}`;

        const pdfBuffer = await generateAutomationPDFFromStream(
          automationHeader,
          { organizationName, taskTitle: headers.taskTitle },
          streamAutomationRuns({ taskId, header: automationHeader }),
        );
        archive.append(pdfBuffer, { name: `${filePrefix}.pdf` });

        if (includeJson) {
          const jsonStream = buildAutomationJsonStream({
            summary: headers,
            header: automationHeader,
            runBatches: streamAutomationRuns({
              taskId,
              header: automationHeader,
            }),
          });
          archive.append(jsonStream, { name: `${filePrefix}.json` });
        }
      }

      manifestEntries.push({
        id: headers.taskId,
        title: headers.taskTitle,
        automations: headers.automations.length,
        attachments: attachments.length,
      });
      totalAttachments += attachments.length;
    } catch (error) {
      console.warn(
        `Failed to export task ${taskId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    metadata.set('tasksCompleted', i + 1);
    metadata.set(
      'progress',
      Math.round(((i + 1) / taskIds.length) * 90),
    );
  }

  manifestEntries.sort((a, b) => a.title.localeCompare(b.title));

  const manifest = {
    organization: organizationName,
    organizationId,
    exportedAt: new Date().toISOString(),
    tasksCount: manifestEntries.length,
    totalAttachments,
    tasks: manifestEntries,
  };
  archive.append(
    Buffer.from(safeStringify(manifest, null, 2) ?? '{}', 'utf-8'),
    { name: `${orgFolder}/manifest.json` },
  );

  await archive.finalize();
}
