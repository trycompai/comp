/**
 * Evidence Attachment Streamer
 * Fetches task attachments and streams them from S3 directly into a ZIP archive.
 */

import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import type { Archiver } from 'archiver';
import { Readable } from 'node:stream';
import { db } from '@db';
import { AttachmentEntityType, type Attachment } from '@db';
import { BUCKET_NAME, s3Client } from '../../app/s3';

const logger = new Logger('EvidenceAttachmentStreamer');

export type TaskAttachment = Pick<
  Attachment,
  'id' | 'name' | 'url' | 'type' | 'createdAt'
>;

/**
 * Fetch attachments uploaded directly to a task.
 * Task-items hold vendor/risk attachments (per `TaskItemEntityType`), so they're
 * intentionally excluded here — this is the task-evidence scope only.
 */
export async function getTaskAttachments(
  organizationId: string,
  taskId: string,
): Promise<TaskAttachment[]> {
  return db.attachment.findMany({
    where: {
      organizationId,
      entityType: AttachmentEntityType.task,
      entityId: taskId,
    },
    select: {
      id: true,
      name: true,
      url: true,
      type: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Create a case-insensitive filename tracker that disambiguates collisions by
 * inserting a numeric suffix before the extension. Scoped per directory.
 */
export function createFilenameTracker(): (rawName: string) => string {
  const used = new Set<string>();
  return (rawName: string) => {
    const sanitized = (rawName || 'file')
      .replace(/[\\/]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
    const dot = sanitized.lastIndexOf('.');
    const base = dot > 0 ? sanitized.slice(0, dot) : sanitized;
    const ext = dot > 0 ? sanitized.slice(dot) : '';
    let candidate = `${base}${ext}`;
    let i = 1;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${base} (${i})${ext}`;
      i += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  };
}

/**
 * Append a single attachment to the archive by streaming its S3 body.
 * If the object is missing (deleted from S3 but DB row still exists), writes a
 * plaintext placeholder so the bundle remains auditable instead of failing.
 */
export async function appendAttachmentToArchive(params: {
  archive: Archiver;
  attachment: TaskAttachment;
  folderPath: string;
  uniqueName: (rawName: string) => string;
}): Promise<void> {
  const { archive, attachment, folderPath, uniqueName } = params;

  if (!s3Client || !BUCKET_NAME) {
    logger.warn(
      `S3 client unavailable — attachment ${attachment.id} skipped with placeholder`,
    );
    archive.append(
      buildMissingPlaceholder(attachment, 'S3 client not configured'),
      { name: `${folderPath}/_MISSING_${uniqueName(attachment.name)}.txt` },
    );
    return;
  }

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: attachment.url,
      }),
    );

    if (!response.Body) {
      throw new Error('S3 returned no body');
    }

    const bodyStream =
      response.Body instanceof Readable
        ? response.Body
        : Readable.from(response.Body as AsyncIterable<Uint8Array>);

    archive.append(bodyStream, {
      name: `${folderPath}/${uniqueName(attachment.name)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Missing S3 object for attachment ${attachment.id} (key=${attachment.url}): ${message}`,
    );
    archive.append(buildMissingPlaceholder(attachment, message), {
      name: `${folderPath}/_MISSING_${uniqueName(attachment.name)}.txt`,
    });
  }
}

function buildMissingPlaceholder(
  attachment: TaskAttachment,
  reason: string,
): string {
  return [
    `Attachment missing from storage.`,
    `attachmentId: ${attachment.id}`,
    `originalName: ${attachment.name}`,
    `s3Key: ${attachment.url}`,
    `reason: ${reason}`,
  ].join('\n');
}
