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
 *
 * - Genuine missing-object errors (`NoSuchKey` / HTTP 404) → write a
 *   `_MISSING_<name>.txt` placeholder so the bundle stays auditable.
 * - All other failures (network, permissions, throttling, empty body) → rethrow
 *   so the archive aborts and the user sees a real failure instead of silently
 *   receiving an incomplete export.
 *
 * Filename collisions are resolved on the *final* ZIP entry name (including
 * any `_MISSING_…txt` wrapping), not the raw attachment name — otherwise a
 * success-path file named `_MISSING_foo.txt` could collide with a failure-path
 * placeholder for a file named `foo` once the wrapping is applied.
 */
export async function appendAttachmentToArchive(params: {
  archive: Archiver;
  attachment: TaskAttachment;
  folderPath: string;
  uniqueName: (rawName: string) => string;
}): Promise<void> {
  const { archive, attachment, folderPath, uniqueName } = params;

  if (!s3Client || !BUCKET_NAME) {
    // Misconfiguration at process level — fail the whole export, don't silently
    // produce placeholders for every attachment.
    throw new Error(
      'S3 client or bucket not configured; cannot stream attachments',
    );
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
    if (!isS3MissingObjectError(error)) {
      logger.error(
        `Failed to fetch attachment ${attachment.id} (key=${attachment.url}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Missing S3 object for attachment ${attachment.id} (key=${attachment.url}): ${message}`,
    );
    // Feed the FULL final name (including `_MISSING_` prefix and `.txt` suffix)
    // into the same collision tracker that success paths use, so a legitimate
    // file uploaded as `_MISSING_foo.txt` can't silently collide with a
    // placeholder for a different missing attachment named `foo`.
    const placeholderName = uniqueName(`_MISSING_${attachment.name}.txt`);
    archive.append(buildMissingPlaceholder(attachment, message), {
      name: `${folderPath}/${placeholderName}`,
    });
  }
}

/**
 * True only for "the object does not exist" — specifically `NoSuchKey` (or
 * `NotFound` for HeadObject semantics). Anything else — including the other
 * 404s like `NoSuchBucket`, or 403s like `AccessDenied` — is a real failure
 * that must surface, not a silent per-attachment skip. A misconfigured bucket
 * returning NoSuchBucket would otherwise produce an export full of placeholders
 * that looks "successful" but contains none of the customer's evidence.
 */
function isS3MissingObjectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { name?: string; Code?: string };
  const code = err.name ?? err.Code;
  return code === 'NoSuchKey' || code === 'NotFound';
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
