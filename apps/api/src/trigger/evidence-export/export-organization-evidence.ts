import { metadata, schemaTask } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PassThrough } from 'node:stream';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
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
// 10 MB parts; the multipart uploader buffers at most queueSize * partSize (~40 MB),
// so worker memory stays flat regardless of total ZIP size.
const UPLOAD_PART_SIZE = 10 * 1024 * 1024;
const UPLOAD_QUEUE_SIZE = 4;

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
      ? { endpoint: process.env.APP_AWS_ENDPOINT, forcePathStyle: true }
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
  // Runs on an isolated worker; 8 GB / 4 vCPU gives ample headroom for jsPDF +
  // zlib across the largest orgs now that the ZIP streams to S3 (never buffered).
  machine: { preset: 'large-1x' },
  // concurrencyLimit 1 + a per-org concurrencyKey (passed at trigger time) means
  // at most one export runs per org at a time; different orgs still run in parallel.
  queue: { name: 'evidence-export', concurrencyLimit: 1 },
  maxDuration: 60 * 30,
  retry: { maxAttempts: 0 },
  schema: z.object({
    organizationId: z.string(),
    includeJson: z.boolean().default(false),
  }),
  run: async ({ organizationId, includeJson }, { ctx }) => {
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
    const s3Key = `${organizationId}/exports/evidence-${exportDate}-${ctx.run.id}.zip`;

    const s3Client = createS3Client();
    const bucket = getBucketName();

    await streamArchiveToS3({
      s3Client,
      bucket,
      key: s3Key,
      populate: (archive) =>
        populateArchive({
          archive,
          organizationId,
          organizationName: organization.name,
          orgFolder,
          taskIds,
          includeJson,
        }),
    });

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

/**
 * Pipe a freshly-built ZIP archive straight to S3 via multipart upload. The
 * archive is populated and uploaded concurrently, so peak memory is bounded by
 * one automation's PDF plus the uploader's part buffer — never the whole ZIP.
 */
export async function streamArchiveToS3(params: {
  s3Client: S3Client;
  bucket: string;
  key: string;
  populate: (archive: archiver.Archiver) => Promise<void>;
}): Promise<void> {
  const { s3Client, bucket, key, populate } = params;

  const archive = archiver('zip', { zlib: { level: 6 } });
  const passThrough = new PassThrough();

  archive.on('warning', (err) => {
    console.warn(`Archive warning (${key}): ${err.message}`);
  });
  // pipe() does not forward source errors to the destination — do it explicitly
  // so a failed archive ends the upload stream and upload.done() rejects.
  archive.on('error', (err) => passThrough.destroy(err));
  archive.pipe(passThrough);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: passThrough,
      ContentType: 'application/zip',
    },
    queueSize: UPLOAD_QUEUE_SIZE,
    partSize: UPLOAD_PART_SIZE,
  });

  const populatePromise = (async () => {
    try {
      await populate(archive);
      await archive.finalize();
    } catch (err) {
      archive.abort();
      passThrough.destroy(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  })();

  // allSettled so a populate failure cannot leave upload.done() pending forever.
  const [populateResult, uploadResult] = await Promise.allSettled([
    populatePromise,
    upload.done(),
  ]);

  if (populateResult.status === 'rejected') {
    await upload.abort().catch(() => {});
    throw populateResult.reason;
  }
  if (uploadResult.status === 'rejected') {
    // Cancel the multipart upload so no orphaned parts linger on S3.
    await upload.abort().catch(() => {});
    throw uploadResult.reason;
  }
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
  const failedTasks: Array<{ taskId: string; reason: string }> = [];
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
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to export task ${taskId}: ${reason}`);
      failedTasks.push({ taskId, reason });
    }

    metadata.set('tasksCompleted', i + 1);
    metadata.set('tasksFailed', failedTasks.length);
    metadata.set('progress', Math.round(((i + 1) / taskIds.length) * 90));
  }

  manifestEntries.sort((a, b) => a.title.localeCompare(b.title));

  // Surface partial failures inside the ZIP itself so an auditor reading only the
  // archive can tell the export is incomplete (not just via the Trigger run UI).
  const manifest = {
    organization: organizationName,
    organizationId,
    exportedAt: new Date().toISOString(),
    tasksCount: manifestEntries.length,
    totalAttachments,
    hasFailures: failedTasks.length > 0,
    failedTasks,
    tasks: manifestEntries,
  };
  archive.append(
    Buffer.from(safeStringify(manifest, null, 2) ?? '{}', 'utf-8'),
    { name: `${orgFolder}/manifest.json` },
  );
  // Note: archive.finalize() is owned by streamArchiveToS3 (the caller).
}
