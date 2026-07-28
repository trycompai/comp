import type { ApiResponse } from '@/lib/api-client';

/**
 * Minimal shape of the client-side API POST method (`apiClient` / `useApi().post`).
 * Injected so this orchestrator can run in the browser AND be unit-tested
 * without a live API.
 */
export type ApiPost = (
  endpoint: string,
  body?: unknown,
) => Promise<ApiResponse<unknown>>;

/** Reads a File's contents as base64 (without the `data:` URL prefix). */
export type ReadFileAsBase64 = (file: File) => Promise<string>;

export interface PolicyBulkUploadItemResult {
  fileName: string;
  /**
   * File size in bytes. Combined with the name it identifies the source file,
   * so the UI can map a result back to its row (dedup / retry keys are name+size).
   */
  fileSize: number;
  status: 'created' | 'failed';
  /**
   * Set once the policy record has been created — present even when the
   * subsequent PDF attach fails, so the caller can point the user at the
   * half-created draft.
   */
  policyId?: string;
  error?: string;
  httpStatus?: number;
}

export interface PolicyBulkUploadResult {
  results: PolicyBulkUploadItemResult[];
  createdCount: number;
  failedCount: number;
}

/**
 * How many files to create+attach at once. Bounded so we never hold more than a
 * handful of (base64-inflated) PDF payloads in memory, while still being faster
 * than a strictly sequential migration.
 */
export const DEFAULT_UPLOAD_CONCURRENCY = 3;

/** Derive a policy name from a file name by stripping the `.pdf` extension. */
function derivePolicyName(fileName: string): string {
  const stripped = fileName.replace(/\.pdf$/i, '').trim();
  return stripped || fileName;
}

/** Pull the created policy id out of an untyped create response. */
function extractPolicyId(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    const { id } = data;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

async function uploadOnePolicy({
  post,
  readFileAsBase64,
  file,
}: {
  post: ApiPost;
  readFileAsBase64: ReadFileAsBase64;
  file: File;
}): Promise<PolicyBulkUploadItemResult> {
  const base = { fileName: file.name, fileSize: file.size };

  // Read the bytes lazily, inside the worker, so only files that are actively
  // uploading are held in memory (never the whole batch at once).
  let fileData: string;
  try {
    fileData = await readFileAsBase64(file);
  } catch {
    return { ...base, status: 'failed', error: `Failed to read ${file.name}` };
  }

  const createRes = await post('/v1/policies', {
    name: derivePolicyName(file.name),
    content: [],
  });
  const policyId = extractPolicyId(createRes.data);

  if (createRes.error || !policyId) {
    return {
      ...base,
      status: 'failed',
      error: createRes.error || 'Failed to create policy',
      httpStatus: createRes.status,
    };
  }

  const attachRes = await post(`/v1/policies/${policyId}/pdf`, {
    fileName: file.name,
    fileType: file.type || 'application/pdf',
    fileData,
  });

  if (attachRes.error) {
    return {
      ...base,
      status: 'failed',
      policyId,
      error: attachRes.error,
      httpStatus: attachRes.status,
    };
  }

  return { ...base, status: 'created', policyId };
}

/**
 * Bulk-imports pre-existing policy documents (e.g. when migrating from another
 * platform). For each uploaded PDF it reuses the single-policy pipeline: create
 * a draft policy with empty editor content via `POST /v1/policies`, then attach
 * the uploaded document via `POST /v1/policies/:id/pdf` (which flips the policy
 * to PDF display format).
 *
 * This runs directly against the NestJS API from the browser — the same path
 * the single-policy `PdfViewer` upload uses — so large PDFs never traverse the
 * Next.js route handler's (Vercel) body limit, and each file is read to base64
 * lazily inside a bounded concurrency pool rather than buffering every file up
 * front.
 *
 * Tenant isolation and RBAC (`policy:create` for create, `policy:update` for the
 * PDF attach) are enforced by those endpoints — this helper only orchestrates
 * them and never touches the database directly. Files are processed
 * independently so a single bad document doesn't abort the rest of the
 * migration; outcomes are reported per file, in input order.
 */
export async function bulkUploadPoliciesViaApi({
  post,
  files,
  readFileAsBase64,
  concurrency = DEFAULT_UPLOAD_CONCURRENCY,
}: {
  post: ApiPost;
  files: File[];
  readFileAsBase64: ReadFileAsBase64;
  concurrency?: number;
}): Promise<PolicyBulkUploadResult> {
  const results: PolicyBulkUploadItemResult[] = new Array(files.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    // `next` is incremented synchronously before the first await, so no two
    // workers ever grab the same index.
    while (next < files.length) {
      const index = next;
      next += 1;
      results[index] = await uploadOnePolicy({
        post,
        readFileAsBase64,
        file: files[index],
      });
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, files.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const createdCount = results.filter((r) => r.status === 'created').length;
  return {
    results,
    createdCount,
    failedCount: results.length - createdCount,
  };
}
